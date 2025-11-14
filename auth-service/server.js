import express from "express";
import { query } from "./db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import swaggerUi from "swagger-ui-express";
import { readFileSync } from "fs";

const app = express();
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const TOKEN_TTL = "1h";
const TIPOS_VALIDOS = ["ADMIN", "USUARIO", "SUPORTE"];

const DIRECTORY_BASE_URL =
  process.env.DIRECTORY_BASE_URL || "http://directory-service:3002";

const swaggerDocument = JSON.parse(
  readFileSync(new URL("./swagger.json", import.meta.url))
);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.get("/health", async (_req, res) => {
  try {
    await query("select 1");
    res.json({ status: "ok", service: "auth", db: "up" });
  } catch {
    res.status(500).json({ status: "error", service: "auth", db: "down" });
  }
});

app.get("/user-types", (_req, res) => {
  res.json(
    TIPOS_VALIDOS.map((tipo) => ({
      codigo: tipo,
      descricao:
        tipo === "ADMIN"
          ? "Administrador do sistema"
          : tipo === "SUPORTE"
          ? "Equipe de suporte"
          : "Usuário comum",
    }))
  );
});

async function ensureSectorExists(nome) {
  if (!nome || !nome.trim()) return;
  try {
    const resp = await fetch(`${DIRECTORY_BASE_URL}/sectors`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: nome.trim() }),
    });
    if (![200, 201, 409].includes(resp.status)) {
      const t = await resp.text();
      console.warn(
        `[auth] /sectors -> ${resp.status}: ${t?.slice(0, 200)}`
      );
    }
  } catch (e) {
    console.warn("[auth] falha ao sincronizar setor:", e.message);
  }
}

async function createDirectoryEmployee({ nome, email, setor, cargo, origemUsuarioId }) {
  try {
    const resp = await fetch(`${DIRECTORY_BASE_URL}/employees`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, email, setor, cargo, origemUsuarioId }),
    });
    if (![200, 201].includes(resp.status)) {
      const t = await resp.text();
      console.warn(
        `[auth] /employees -> ${resp.status}: ${t?.slice(0, 200)}`
      );
    }
  } catch (e) {
    console.warn("[auth] falha ao criar employee no directory:", e.message);
  }
}

app.post("/register", async (req, res) => {
  const { name, email, password, tipoUsuario, setor, cargo } = req.body || {};

  if (!name || !email || !password || !setor || !cargo) {
    return res.status(400).json({
      error: "name, email, password, setor e cargo são obrigatórios",
    });
  }

  const userType = (tipoUsuario || "USUARIO").toUpperCase();
  if (!TIPOS_VALIDOS.includes(userType)) {
    return res
      .status(400)
      .json({ error: "Tipo de usuário inválido. Use: ADMIN, USUARIO ou SUPORTE" });
  }

  const hash = await bcrypt.hash(password, 10);

  try {
    const { rows } = await query(
      `INSERT INTO users (name, email, password_hash, tipo_usuario, setor, cargo)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id, name, email, tipo_usuario AS "tipoUsuario", setor, cargo`,
      [name, email, hash, userType, setor, cargo]
    );

    const u = rows[0];

    await ensureSectorExists(setor);
    await createDirectoryEmployee({
      nome: name,
      email,
      setor,
      cargo,
      origemUsuarioId: u.id,
    });

    return res.status(201).json({
      id: u.id,
      name: u.name,
      email: u.email,
      tipoUsuario: u.tipoUsuario,
      setor: u.setor,
      cargo: u.cargo,
    });
  } catch (e) {
    if (String(e.message).includes("duplicate key")) {
      return res.status(409).json({ error: "email já cadastrado" });
    }
    console.error(e);
    return res.status(500).json({ error: "erro ao registrar usuário" });
  }
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password)
    return res.status(400).json({ error: "email e password são obrigatórios" });

  const { rows } = await query(
    `SELECT id, name, email, password_hash, tipo_usuario AS "tipoUsuario", setor, cargo
     FROM users WHERE email = $1`,
    [email]
  );
  const user = rows[0];
  if (!user) return res.status(401).json({ error: "credenciais inválidas" });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: "credenciais inválidas" });

  const token = jwt.sign(
    {
      sub: user.id,
      email: user.email,
      tipoUsuario: user.tipoUsuario,
      setor: user.setor,
      cargo: user.cargo,
    },
    JWT_SECRET,
    { expiresIn: TOKEN_TTL }
  );

  res.json({
    accessToken: token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      tipoUsuario: user.tipoUsuario,
      setor: user.setor,
      cargo: user.cargo,
    },
  });
});

function auth(req, res, next) {
  const h = req.headers.authorization || "";
  const [, token] = h.split(" ");
  if (!token) return res.status(401).json({ error: "token ausente" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "token inválido" });
  }
}

app.get("/me", auth, (req, res) => {
  res.json({ me: req.user });
});

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`[auth] up on :${port}`));

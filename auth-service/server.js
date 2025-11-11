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

app.post("/register", async (req, res) => {
  const { name, email, password, tipoUsuario, setor, cargo } = req.body || {};

  if (!name || !email || !password || !setor || !cargo) {
    return res.status(400).json({
      error: "name, email, password, setor e cargo são obrigatórios",
    });
  }

  const validTypes = ["ADMIN", "USUARIO", "SUPORTE"];
  const userType = (tipoUsuario || "USUARIO").toUpperCase();
  if (!validTypes.includes(userType)) {
    return res
      .status(400)
      .json({ error: "Tipo de usuário inválido. Use: ADMIN, USUARIO ou SUPORTE" });
  }

  const hash = await bcrypt.hash(password, 10);

  try {
    const { rows } = await query(
      `INSERT INTO users (name, email, password_hash, roles, setor, cargo)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, email, roles, setor, cargo`,
      [name, email, hash, [userType], setor, cargo]
    );

    const u = rows[0];
    res.status(201).json({
      id: u.id,
      name: u.name,
      email: u.email,
      tipoUsuario: Array.isArray(u.roles) && u.roles.length ? u.roles[0] : "USUARIO",
      setor: u.setor,
      cargo: u.cargo,
    });
  } catch (e) {
    if (String(e.message).includes("duplicate key")) {
      return res.status(409).json({ error: "email já cadastrado" });
    }
    console.error(e);
    res.status(500).json({ error: "erro ao registrar usuário" });
  }
});


app.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password)
    return res.status(400).json({ error: "email e password são obrigatórios" });

  const { rows } = await query(
    "SELECT id, name, email, password_hash, roles, setor, cargo FROM users WHERE email = $1",
    [email]
  );
  const user = rows[0];
  if (!user) return res.status(401).json({ error: "credenciais inválidas" });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: "credenciais inválidas" });

  const tipoUsuario = Array.isArray(user.roles) && user.roles.length ? user.roles[0] : "USUARIO";

  const token = jwt.sign(
    {
      sub: user.id,
      email: user.email,
      tipoUsuario,   
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
      tipoUsuario,   
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

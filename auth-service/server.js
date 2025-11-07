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

// Swagger
const swaggerDocument = JSON.parse(
  readFileSync(new URL("./swagger.json", import.meta.url))
);

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Health com ping ao DB
app.get("/health", async (_req, res) => {
  try {
    await query("select 1");
    res.json({ status: "ok", service: "auth", db: "up" });
  } catch {
    res.status(500).json({ status: "error", service: "auth", db: "down" });
  }
});

// Registro
app.post("/register", async (req, res) => {
  const { name, email, password, roles } = req.body || {};
  if (!name || !email || !password) {
    return res.status(400).json({ error: "name, email e password são obrigatórios" });
  }
  const hash = await bcrypt.hash(password, 10);
  try {
    const { rows } = await query(
      "insert into users (name, email, password_hash, roles) values ($1,$2,$3,$4) returning id, name, email, roles",
      [name, email, hash, Array.isArray(roles) && roles.length ? roles : ["USUARIO"]]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    if (String(e.message).includes("duplicate key")) {
      return res.status(409).json({ error: "email já cadastrado" });
    }
    res.status(500).json({ error: "erro ao registrar" });
  }
});

// Login
app.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "email e password são obrigatórios" });

  const { rows } = await query("select id, name, email, password_hash, roles from users where email = $1", [email]);
  const user = rows[0];
  if (!user) return res.status(401).json({ error: "credenciais inválidas" });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: "credenciais inválidas" });

  const token = jwt.sign({ sub: user.id, email: user.email, roles: user.roles }, JWT_SECRET, { expiresIn: TOKEN_TTL });
  res.json({ accessToken: token, user: { id: user.id, name: user.name, email: user.email, roles: user.roles } });
});

// Middleware para rotas protegidas
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

// Exemplo rota protegida
app.get("/me", auth, (req, res) => {
  res.json({ me: req.user });
});

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`[auth] up on :${port}`));

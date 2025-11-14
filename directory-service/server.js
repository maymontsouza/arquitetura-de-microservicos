import express from "express";
import { query } from "./db.js";
import swaggerUi from "swagger-ui-express";
import { readFileSync } from "fs";
import jwt from "jsonwebtoken";

const app = express();
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

const swaggerDocument = JSON.parse(
  readFileSync(new URL("./swagger.json", import.meta.url))
);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// LOG SIMPLES pra gente ver se o Traefik está chegando aqui
app.use((req, _res, next) => {
  console.log("[directory] req:", req.method, req.url);
  next();
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

function requireRole(...allowed) {
  return (req, res, next) => {
    const tipo = req.user?.tipoUsuario;
    if (!tipo || !allowed.includes(tipo)) {
      return res
        .status(403)
        .json({ error: "acesso negado para o tipo de usuário atual" });
    }
    next();
  };
}

app.get("/health", async (_req, res) => {
  try {
    await query("select 1");
    res.json({ status: "ok", service: "directory" });
  } catch {
    res.status(500).json({ status: "error", service: "directory" });
  }
});

app.post("/sectors", auth, requireRole("ADMIN"), async (req, res) => {
  const { nome } = req.body || {};
  if (!nome || !nome.trim()) {
    return res.status(400).json({ error: "nome é obrigatório" });
  }

  try {
    const { rows } = await query(
      `
      INSERT INTO setor (nome)
      VALUES ($1)
      ON CONFLICT (nome) DO UPDATE SET nome = EXCLUDED.nome
      RETURNING id, nome
      `,
      [nome.trim()]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "erro ao criar/atualizar setor" });
  }
});

app.get(
  "/sectors",
  auth,
  requireRole("ADMIN", "SUPORTE"),
  async (_req, res) => {
    try {
      const { rows } = await query(
        `SELECT id, nome FROM setor ORDER BY nome ASC`
      );
      res.json(rows);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "erro ao listar setores" });
    }
  }
);

app.post("/employees", async (req, res) => {
  const { nome, email, setor, cargo, origemUsuarioId } = req.body || {};

  if (!nome || !email || !cargo) {
    return res
      .status(400)
      .json({ error: "nome, email e cargo são obrigatórios" });
  }

  try {
    let setorId = null;
    if (setor && setor.trim()) {
      const { rows: setorRows } = await query(
        `
        INSERT INTO setor (nome)
        VALUES ($1)
        ON CONFLICT (nome) DO UPDATE SET nome = EXCLUDED.nome
        RETURNING id
        `,
        [setor.trim()]
      );
      setorId = setorRows[0].id;
    }

    const { rows } = await query(
      `
      INSERT INTO employees (nome, email, cargo, setor_id, origem_usuario_id)
      VALUES ($1,$2,$3,$4,$5)
      ON CONFLICT (email) DO UPDATE
        SET nome = EXCLUDED.nome,
            cargo = EXCLUDED.cargo,
            setor_id = EXCLUDED.setor_id,
            origem_usuario_id = EXCLUDED.origem_usuario_id
      RETURNING id, nome, email, cargo, setor_id AS "setorId", origem_usuario_id AS "origemUsuarioId"
      `,
      [nome, email, cargo, setorId, origemUsuarioId || null]
    );

    res.status(201).json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "erro ao criar/atualizar employee" });
  }
});

app.get(
  "/employees",
  auth,
  requireRole("ADMIN", "SUPORTE"),
  async (_req, res) => {
    try {
      const { rows } = await query(
        `
        SELECT
          e.id,
          e.nome,
          e.email,
          e.cargo,
          e.origem_usuario_id AS "origemUsuarioId",
          s.id   AS "setorId",
          s.nome AS "setorNome"
        FROM employees e
        LEFT JOIN setor s ON s.id = e.setor_id
        ORDER BY e.nome ASC
        `
      );
      res.json(rows);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "erro ao listar employees" });
    }
  }
);

const port = process.env.PORT || 3002;
app.listen(port, () => console.log(`[directory] up on :${port}`));

import { query } from "./db.js";
import express from "express";
import swaggerUi from "swagger-ui-express";
import { readFileSync } from "fs";

const app = express();
app.use(express.json());

const swaggerDocument = JSON.parse(
  readFileSync(new URL("./swagger.json", import.meta.url))
);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

async function handleHealth(_req, res) {
  try {
    await query("SELECT 1");
    res.json({ status: "ok", service: "directory", db: "up" });
  } catch {
    res
      .status(500)
      .json({ status: "error", service: "directory", db: "down" });
  }
}

app.get("/health", handleHealth);
app.get("/directory/health", handleHealth);

app.get("/sectors", async (_req, res) => {
  try {
    const { rows } = await query("SELECT id, nome FROM setor ORDER BY id");
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "erro ao listar setores" });
  }
});

app.get("/directory/sectors", async (req, res) => {
  return app._router.handle({ ...req, url: "/sectors", method: "GET" }, res);
});

app.post("/sectors", async (req, res) => {
  const { nome } = req.body || {};
  if (!nome || !nome.trim()) {
    return res.status(400).json({ error: "campo nome é obrigatório" });
  }

  try {
    const result = await query(
      `
      WITH ins AS (
        INSERT INTO setor (nome)
        VALUES ($1)
        ON CONFLICT (nome) DO NOTHING
        RETURNING id, nome
      )
      SELECT id, nome FROM ins
      UNION ALL
      SELECT id, nome FROM setor WHERE nome = $1
      LIMIT 1;
      `,
      [nome.trim()]
    );

    res.status(201).json(result.rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "erro ao criar setor" });
  }
});

app.post("/directory/sectors", async (req, res) => {
  return app._router.handle({ ...req, url: "/sectors", method: "POST" }, res);
});

async function handleListEmployees(_req, res) {
  try {
    const { rows } = await query(
      `
      SELECT e.id,
             e.nome,
             e.email,
             e.cargo,
             e.origem_usuario_id AS "origemUsuarioId",
             s.id   AS "setorId",
             s.nome AS "setorNome"
      FROM employees e
      LEFT JOIN setor s ON s.id = e.setor_id
      ORDER BY e.id
      `
    );
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "erro ao listar funcionários" });
  }
}

app.get("/employees", handleListEmployees);
app.get("/directory/employees", handleListEmployees);

app.post("/employees", async (req, res) => {
  const { nome, email, setor, setorId, cargo, origemUsuarioId } = req.body || {};

  if (!nome || !email) {
    return res
      .status(400)
      .json({ error: "nome e email são obrigatórios" });
  }

  try {
    let sid = setorId ?? null;

    if (!sid && setor) {
      const r = await query(
        `
        WITH s AS (
          INSERT INTO setor (nome)
          VALUES ($1)
          ON CONFLICT (nome) DO NOTHING
          RETURNING id
        )
        SELECT id FROM s
        UNION ALL
        SELECT id FROM setor WHERE nome = $1
        LIMIT 1;
        `,
        [setor.trim()]
      );
      sid = r.rows[0]?.id ?? null;
    }

    const ins = await query(
      `
      INSERT INTO employees (nome, email, cargo, setor_id, origem_usuario_id)
      VALUES ($1,$2,$3,$4,$5)
      RETURNING id,
                nome,
                email,
                cargo,
                setor_id          AS "setorId",
                origem_usuario_id AS "origemUsuarioId"
      `,
      [nome, email, cargo ?? null, sid, origemUsuarioId ?? null]
    );

    res.status(201).json(ins.rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "erro ao criar funcionário" });
  }
});

app.post("/directory/employees", async (req, res) => {
  return app._router.handle({ ...req, url: "/employees", method: "POST" }, res);
});

const port = process.env.PORT || 3002;
app.listen(port, () => console.log(`[directory] up on :${port}`));

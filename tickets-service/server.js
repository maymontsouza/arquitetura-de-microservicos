import express from "express";
import { query } from "./db.js";
import jwt from "jsonwebtoken";
import swaggerUi from "swagger-ui-express";
import { readFileSync } from "fs";

const app = express();
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

const swaggerDocument = JSON.parse(
  readFileSync(new URL("./swagger.json", import.meta.url))
);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

function auth(req, res, next) {
  const h = req.headers.authorization || "";
  const [, token] = h.split(" ");
  if (!token) return res.status(401).json({ error: "token ausente" });

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    return next();
  } catch {
    return res.status(401).json({ error: "token inválido" });
  }
}

app.get("/health", async (_req, res) => {
  try {
    await query("select 1");
    res.json({ status: "ok", service: "tickets" });
  } catch {
    res.status(500).json({ status: "error", service: "tickets" });
  }
});

app.get("/", async (_req, res) => {
  try {
    const { rows } = await query(
      `
      SELECT
        id,
        titulo,
        descricao,
        status,
        setor_destino_id AS "setorDestinoId",
        solicitante_id   AS "solicitanteId",
        created_at       AS "dataAbertura",
        updated_at       AS "dataUltimaAtualizacao"
      FROM tickets
      ORDER BY id DESC
      `
    );
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "erro ao listar tickets" });
  }
});

app.get("/my", auth, async (req, res) => {
  const userId = req.user.sub;

  try {
    const { rows } = await query(
      `
      SELECT
        id,
        titulo,
        descricao,
        status,
        setor_destino_id AS "setorDestinoId",
        solicitante_id   AS "solicitanteId",
        created_at       AS "dataAbertura",
        updated_at       AS "dataUltimaAtualizacao"
      FROM tickets
      WHERE solicitante_id = $1
      ORDER BY id DESC
      `,
      [userId]
    );
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "erro ao listar tickets do usuário" });
  }
});

app.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!id) {
    return res.status(400).json({ error: "id inválido" });
  }

  try {
    const { rows } = await query(
      `
      SELECT
        id,
        titulo,
        descricao,
        status,
        setor_destino_id AS "setorDestinoId",
        solicitante_id   AS "solicitanteId",
        created_at       AS "dataAbertura",
        updated_at       AS "dataUltimaAtualizacao"
      FROM tickets
      WHERE id = $1
      `,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: "ticket não encontrado" });
    }

    res.json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "erro ao buscar ticket" });
  }
});

app.post("/", auth, async (req, res) => {
  const { titulo, descricao, setorDestinoId } = req.body || {};

  if (!titulo || !descricao || !setorDestinoId) {
    return res.status(400).json({
      error: "titulo, descricao e setorDestinoId são obrigatórios",
    });
  }

  const userId = req.user.sub;

  try {
    const { rows } = await query(
      `
      INSERT INTO tickets (titulo, descricao, status, setor_destino_id, solicitante_id)
      VALUES ($1,$2,'Aberto',$3,$4)
      RETURNING
        id,
        titulo,
        descricao,
        status,
        setor_destino_id AS "setorDestinoId",
        solicitante_id   AS "solicitanteId",
        created_at       AS "dataAbertura",
        updated_at       AS "dataUltimaAtualizacao"
      `,
      [titulo, descricao, setorDestinoId, userId]
    );

    res.status(201).json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "erro ao criar ticket" });
  }
});

app.patch("/:id/status", auth, async (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body || {};
  if (!id || !status) {
    return res.status(400).json({ error: "id e status são obrigatórios" });
  }

  try {
    const { rows } = await query(
      `
      UPDATE tickets
      SET status = $2,
          updated_at = NOW()
      WHERE id = $1
      RETURNING
        id,
        titulo,
        descricao,
        status,
        setor_destino_id AS "setorDestinoId",
        solicitante_id   AS "solicitanteId",
        created_at       AS "dataAbertura",
        updated_at       AS "dataUltimaAtualizacao"
      `,
      [id, status]
    );

    if (!rows.length) {
      return res.status(404).json({ error: "ticket não encontrado" });
    }

    res.json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "erro ao atualizar status" });
  }
});

app.post("/:id/comments", auth, async (req, res) => {
  const ticketId = Number(req.params.id);
  const { mensagem } = req.body || {};

  if (!ticketId || !mensagem) {
    return res
      .status(400)
      .json({ error: "id do ticket e mensagem são obrigatórios" });
  }

  try {
    const { rows } = await query(
      `
      INSERT INTO ticket_comments (ticket_id, author_id, mensagem)
      VALUES ($1,$2,$3)
      RETURNING
        id,
        ticket_id AS "ticketId",
        author_id AS "authorId",
        mensagem,
        created_at AS "criadoEm"
      `,
      [ticketId, req.user.sub, mensagem]
    );

    res.status(201).json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "erro ao adicionar comentário" });
  }
});

app.get("/:id/comments", async (req, res) => {
  const ticketId = Number(req.params.id);
  if (!ticketId) {
    return res.status(400).json({ error: "id inválido" });
  }

  try {
    const { rows } = await query(
      `
      SELECT
        id,
        ticket_id AS "ticketId",
        author_id AS "authorId",
        mensagem,
        created_at AS "criadoEm"
      FROM ticket_comments
      WHERE ticket_id = $1
      ORDER BY id ASC
      `,
      [ticketId]
    );

    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "erro ao listar comentários" });
  }
});

const port = process.env.PORT || 3003;
app.listen(port, () => console.log(`[tickets] up on :${port}`));

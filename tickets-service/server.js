import express from "express";
import jwt from "jsonwebtoken";
import { pool, ping } from "./db.js";

const app = express();
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

const VALID_STATUSES = new Set([
  "Aberto",
  "Em Andamento",
  "Aguardando Resposta",
  "Resolvido",
  "Fechado",
]);

function ensureStatus(value) {
  if (!VALID_STATUSES.has(value)) {
    throw new Error(
      "status inválido. use: " + Array.from(VALID_STATUSES).join(", ")
    );
  }
}

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

app.get("/health", async (_req, res) => {
  try {
    const ok = await ping();
    res.json({ status: "ok", service: "tickets", db: ok ? "up" : "down" });
  } catch (e) {
    res.status(500).json({ status: "fail", error: String(e) });
  }
});

app.get("/tickets", async (_req, res) => {
  const q = `SELECT id, titulo, descricao, status, setor_destino_id, solicitante_id, created_at, updated_at
             FROM tickets
             ORDER BY id`;
  const r = await pool.query(q);
  res.json(r.rows);
});

app.get("/tickets/:id", async (req, res) => {
  const id = req.params.id;

  const t = await pool.query(
    `SELECT id, titulo, descricao, status, setor_destino_id, solicitante_id, created_at, updated_at
     FROM tickets
     WHERE id = $1`,
    [id]
  );
  if (!t.rows[0]) return res.status(404).json({ error: "ticket não encontrado" });

  const c = await pool.query(
    `SELECT id, ticket_id, author_id, mensagem, created_at
     FROM ticket_comments
     WHERE ticket_id = $1
     ORDER BY id`,
    [id]
  );

  res.json({ ...t.rows[0], comentarios: c.rows });
});

app.post("/tickets", auth, async (req, res) => {
  const { titulo, descricao, setor_destino_id, solicitante_id, status } =
    req.body || {};

  if (!titulo || !descricao || !setor_destino_id || !solicitante_id) {
    return res.status(400).json({ error: "campos obrigatórios faltando" });
  }
  if (status) ensureStatus(status);

  const r = await pool.query(
    `INSERT INTO tickets (titulo, descricao, status, setor_destino_id, solicitante_id)
     VALUES ($1,$2, COALESCE($3,'Aberto'), $4, $5)
     RETURNING id, titulo, descricao, status, setor_destino_id, solicitante_id, created_at, updated_at`,
    [titulo, descricao, status || null, setor_destino_id, solicitante_id]
  );

  res.status(201).json(r.rows[0]);
});

app.patch("/tickets/:id", auth, async (req, res) => {
  const id = req.params.id;
  const { titulo, descricao, status, setor_destino_id } = req.body || {};

  if (status) ensureStatus(status);

  const fields = [];
  const vals = [];
  let i = 1;

  if (titulo !== undefined) {
    fields.push(`titulo = $${i++}`);
    vals.push(titulo);
  }
  if (descricao !== undefined) {
    fields.push(`descricao = $${i++}`);
    vals.push(descricao);
  }
  if (status !== undefined) {
    fields.push(`status = $${i++}`);
    vals.push(status);
  }
  if (setor_destino_id !== undefined) {
    fields.push(`setor_destino_id = $${i++}`);
    vals.push(setor_destino_id);
  }

  if (!fields.length) {
    return res.status(400).json({ error: "nada para atualizar" });
  }

  fields.push(`updated_at = NOW()`);
  vals.push(id);

  const r = await pool.query(
    `UPDATE tickets SET ${fields.join(", ")} WHERE id = $${i}
     RETURNING id, titulo, descricao, status, setor_destino_id, solicitante_id, created_at, updated_at`,
    vals
  );
  if (!r.rows[0]) return res.status(404).json({ error: "ticket não encontrado" });
  res.json(r.rows[0]);
});

app.get("/tickets/:id/comments", async (req, res) => {
  const ticketId = req.params.id;

  const t = await pool.query(`SELECT id FROM tickets WHERE id=$1`, [ticketId]);
  if (!t.rows[0]) return res.status(404).json({ error: "ticket não encontrado" });

  const r = await pool.query(
    `SELECT id, ticket_id, author_id, mensagem, created_at
     FROM ticket_comments
     WHERE ticket_id = $1
     ORDER BY id`,
    [ticketId]
  );
  res.json(r.rows);
});

app.post("/tickets/:id/comments", auth, async (req, res) => {
  const ticketId = req.params.id;
  const { mensagem } = req.body || {};
  if (!mensagem) return res.status(400).json({ error: "mensagem obrigatória" });

  const t = await pool.query(`SELECT id FROM tickets WHERE id=$1`, [ticketId]);
  if (!t.rows[0]) return res.status(404).json({ error: "ticket não encontrado" });

  const authorId = req.user?.id || 0;

  const r = await pool.query(
    `INSERT INTO ticket_comments (ticket_id, author_id, mensagem)
     VALUES ($1,$2,$3)
     RETURNING id, ticket_id, author_id, mensagem, created_at`,
    [ticketId, authorId, mensagem]
  );

  res.status(201).json(r.rows[0]);
});

app.get("/", async (_req, res) => {
  const q = `SELECT id, titulo, descricao, status, setor_destino_id, solicitante_id, created_at, updated_at
             FROM tickets
             ORDER BY id`;
  const r = await pool.query(q);
  res.json(r.rows);
});

app.post("/", auth, async (req, res) => {
  const { titulo, descricao, setor_destino_id, solicitante_id, status } = req.body || {};
  if (!titulo || !descricao || !setor_destino_id || !solicitante_id) {
    return res.status(400).json({ error: "campos obrigatórios faltando" });
  }
  if (status) ensureStatus(status);

  const r = await pool.query(
    `INSERT INTO tickets (titulo, descricao, status, setor_destino_id, solicitante_id)
     VALUES ($1,$2, COALESCE($3,'Aberto'), $4, $5)
     RETURNING id, titulo, descricao, status, setor_destino_id, solicitante_id, created_at, updated_at`,
    [titulo, descricao, status || null, setor_destino_id, solicitante_id]
  );
  res.status(201).json(r.rows[0]);
});

const port = process.env.PORT || 3003;
app.listen(port, () => console.log(`[tickets] up on :${port}`));

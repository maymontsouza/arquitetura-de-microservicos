import express from "express";
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

const VALID_STATUSES = new Set([
  "Aberto",
  "Em Andamento",
  "Aguardando Resposta",
  "Resolvido",
  "Fechado",
]);

function assertValidStatus(value) {
  if (!VALID_STATUSES.has(value)) {
    const allowed = Array.from(VALID_STATUSES).join(", ");
    const msg = `status inválido. Use um destes: ${allowed}`;
    const err = new Error(msg);
    err.code = "INVALID_STATUS";
    throw err;
  }
}

let tickets = [
  {
    id: 1,
    titulo: "Erro na tela",
    descricao: "Não carrega",
    status: "Aberto",
    setor_destino_id: 2,
    solicitante_id: 1,
  },
];

let comments = [];

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

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "tickets" });
});

function handleError(res, e) {
  if (e?.code === "INVALID_STATUS") {
    return res.status(400).json({ error: e.message });
  }
  return res.status(500).json({ error: "erro interno" });
}

app.get("/", (_req, res) => res.json(tickets));
app.get("/tickets", (_req, res) => res.json(tickets));

app.get("/statuses", (_req, res) => res.json(Array.from(VALID_STATUSES)));
app.get("/tickets/statuses", (_req, res) => res.json(Array.from(VALID_STATUSES)));

function createTicket(req, res) {
  try {
    const { titulo, descricao, setor_destino_id, solicitante_id, status } = req.body || {};
    if (!titulo || !descricao || !setor_destino_id || !solicitante_id) {
      return res.status(400).json({ error: "Campos obrigatórios faltando." });
    }
    if (status !== undefined) assertValidStatus(status);

    const novo = {
      id: tickets.length + 1,
      titulo,
      descricao,
      status: status ?? "Aberto",
      setor_destino_id,
      solicitante_id,
    };
    tickets.push(novo);
    res.status(201).json(novo);
  } catch (e) {
    handleError(res, e);
  }
}
app.post("/", auth, createTicket);
app.post("/tickets", auth, createTicket);

function patchTicket(req, res) {
  try {
    const id = Number(req.params.id);
    const { status, titulo, descricao } = req.body || {};
    const t = tickets.find((x) => x.id === id);
    if (!t) return res.status(404).json({ error: "ticket não encontrado" });

    if (status !== undefined) assertValidStatus(status);
    if (status !== undefined) t.status = status;
    if (titulo !== undefined) t.titulo = titulo;
    if (descricao !== undefined) t.descricao = descricao;

    t.updated_at = new Date();
    res.json(t);
  } catch (e) {
    handleError(res, e);
  }
}

function patchTicketStatus(req, res) {
  try {
    const id = Number(req.params.id);
    const { status } = req.body || {};
    const t = tickets.find((x) => x.id === id);
    if (!t) return res.status(404).json({ error: "ticket não encontrado" });
    if (!status) return res.status(400).json({ error: "status obrigatório" });

    assertValidStatus(status);
    t.status = status;
    t.updated_at = new Date();
    res.json(t);
  } catch (e) {
    handleError(res, e);
  }
}

app.patch("/tickets/:id", auth, patchTicket);
app.patch("/tickets/:id/status", auth, patchTicketStatus);

app.patch("/:id", auth, patchTicket);
app.patch("/:id/status", auth, patchTicketStatus);

function listComments(req, res) {
  const id = Number(req.params.id);
  const ticket = tickets.find((t) => t.id === id);
  if (!ticket) return res.status(404).json({ error: "ticket não encontrado" });
  res.json(comments.filter((c) => c.ticket_id === id));
}

function addComment(req, res) {
  const id = Number(req.params.id);
  const { mensagem } = req.body || {};
  if (!mensagem) return res.status(400).json({ error: "mensagem obrigatória" });

  const ticket = tickets.find((t) => t.id === id);
  if (!ticket) return res.status(404).json({ error: "ticket não encontrado" });

  const novo = {
    id: comments.length + 1,
    ticket_id: id,
    author_id: req.user?.id || 0,
    mensagem,
    created_at: new Date(),
  };
  comments.push(novo);
  res.status(201).json(novo);
}

app.get("/tickets/:id/comments", listComments);
app.post("/tickets/:id/comments", auth, addComment);

app.get("/:id/comments", listComments);
app.post("/:id/comments", auth, addComment);

const port = process.env.PORT || 3003;
app.listen(port, () => console.log(`[tickets] up on :${port}`));

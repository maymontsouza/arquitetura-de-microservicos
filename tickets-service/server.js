import express from "express";
const app = express();
app.use(express.json());

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

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "tickets" });
});

app.get("/", (_req, res) => {
  res.json(tickets);
});

app.get("/tickets", (_req, res) => {
  res.json(tickets);
});

app.post("/", (req, res) => {
  const { titulo, descricao, setor_destino_id, solicitante_id } = req.body || {};

  if (!titulo || !descricao || !setor_destino_id || !solicitante_id) {
    return res.status(400).json({ error: "Campos obrigatórios faltando." });
  }

  const novo = {
    id: tickets.length + 1,
    titulo,
    descricao,
    status: "Aberto",
    setor_destino_id,
    solicitante_id,
  };

  tickets.push(novo);
  res.status(201).json(novo);
});

app.post("/tickets", (req, res) => {
  const { titulo, descricao, setor_destino_id, solicitante_id } = req.body || {};

  if (!titulo || !descricao || !setor_destino_id || !solicitante_id) {
    return res.status(400).json({ error: "Campos obrigatórios faltando." });
  }

  const novo = {
    id: tickets.length + 1,
    titulo,
    descricao,
    status: "Aberto",
    setor_destino_id,
    solicitante_id,
  };

  tickets.push(novo);
  res.status(201).json(novo);
});

const port = process.env.PORT || 3003;
app.listen(port, () => console.log(`[tickets] up on :${port}`));

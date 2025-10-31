import express from "express";
const app = express();
app.use(express.json());

// mock data só para teste inicial
const setores = [
  { id: 1, nome: "TI" },
  { id: 2, nome: "Atendimento" }
];

const funcionarios = [
  { id: 1, nome: "May", email: "may@example.com", setor_id: 1, cargo: "QA" }
];

// endpoint de saúde padronizado
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "directory" });
});

// rotas principais
app.get("/sectors", (_req, res) => {
  res.json(setores);
});

app.get("/employees", (_req, res) => {
  res.json(funcionarios);
});

const port = process.env.PORT || 3002;
app.listen(port, () => console.log(`[directory] up on :${port}`));

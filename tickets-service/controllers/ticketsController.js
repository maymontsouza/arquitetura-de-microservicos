import jwt from "jsonwebtoken";
import { TicketsRepo } from "../repositories/ticketsRepo.js";
import { TicketsService } from "../services/ticketsService.js";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

export function auth(req, res, next) {
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

export const TicketsController = {
  health: async (_req, res) => {
    try {
      res.json({ status: "ok", service: "tickets" });
    } catch {
      res.status(500).json({ status: "error", service: "tickets" });
    }
  },

  list: async (_req, res) => {
    const rows = await TicketsRepo.list();
    res.json(rows);
  },

  create: async (req, res) => {
    TicketsService.validateNewTicket(req.body || {});
    const novo = await TicketsRepo.create(req.body);
    res.status(201).json(novo);
  },

  updateStatus: async (req, res) => {
    const { id } = req.params;
    const { status } = req.body || {};
    try {
      TicketsService.validateStatus(status);
      const updated = await TicketsRepo.updateStatus(id, status);
      if (!updated) return res.status(404).json({ error: "chamado não encontrado" });
      res.json(updated);
    } catch (e) {
      if (e.status) return res.status(e.status).json({ error: e.message, allowed: e.allowed });
      res.status(500).json({ error: "erro ao atualizar status" });
    }
  },

  listComments: async (req, res) => {
    const rows = await TicketsRepo.listComments(req.params.id);
    res.json(rows);
  },

  addComment: async (req, res) => {
    const { mensagem, autor_id } = req.body || {};
    if (!mensagem || !autor_id) {
      return res.status(400).json({ error: "mensagem e autor_id são obrigatórios" });
    }
    const novo = await TicketsRepo.addComment(req.params.id, autor_id, mensagem);
    res.status(201).json(novo);
  },
};

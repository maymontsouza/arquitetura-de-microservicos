const ALLOWED_STATUS = [
  "Aberto",
  "Em Andamento",
  "Aguardando Resposta",
  "Resolvido",
  "Fechado",
];

export const TicketsService = {
  validateNewTicket: ({ titulo, descricao, setor_destino_id, solicitante_id }) => {
    if (!titulo || !descricao || !setor_destino_id || !solicitante_id) {
      const err = new Error("campos obrigatórios faltando");
      err.status = 400;
      throw err;
    }
  },

  validateStatus: (status) => {
    if (!ALLOWED_STATUS.includes(status)) {
      const err = new Error("status inválido");
      err.status = 400;
      err.allowed = ALLOWED_STATUS;
      throw err;
    }
  },

  allowedStatuses: ALLOWED_STATUS,
};

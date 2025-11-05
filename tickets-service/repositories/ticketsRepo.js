import { query } from "../db.js";

export const TicketsRepo = {
  list: async () => {
    const { rows } = await query(
      `SELECT id, titulo, descricao, status, setor_destino_id, solicitante_id, created_at, updated_at
       FROM chamado ORDER BY id`
    );
    return rows;
  },

  create: async ({ titulo, descricao, setor_destino_id, solicitante_id }) => {
    const { rows } = await query(
      `INSERT INTO chamado (titulo, descricao, setor_destino_id, solicitante_id)
       VALUES ($1,$2,$3,$4)
       RETURNING id, titulo, descricao, status, setor_destino_id, solicitante_id, created_at, updated_at`,
      [titulo, descricao, Number(setor_destino_id), Number(solicitante_id)]
    );
    return rows[0];
  },

  updateStatus: async (id, status) => {
    const { rows } = await query(
      `UPDATE chamado SET status = $1 WHERE id = $2
       RETURNING id, titulo, descricao, status, setor_destino_id, solicitante_id, created_at, updated_at`,
      [status, Number(id)]
    );
    return rows[0];
  },

  listComments: async (chamadoId) => {
    const { rows } = await query(
      `SELECT id, chamado_id, autor_id, mensagem, created_at
       FROM comentario WHERE chamado_id = $1 ORDER BY id`,
      [Number(chamadoId)]
    );
    return rows;
  },

  addComment: async (chamadoId, autorId, mensagem) => {
    const { rows } = await query(
      `INSERT INTO comentario (chamado_id, autor_id, mensagem)
       VALUES ($1,$2,$3)
       RETURNING id, chamado_id, autor_id, mensagem, created_at`,
      [Number(chamadoId), Number(autorId), mensagem]
    );
    return rows[0];
  },
};

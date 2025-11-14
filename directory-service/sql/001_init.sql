CREATE TABLE IF NOT EXISTS tickets (
  id               SERIAL PRIMARY KEY,
  titulo           TEXT NOT NULL,
  descricao        TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'Aberto' CHECK (status IN (
                      'Aberto',
                      'Em Andamento',
                      'Aguardando Resposta',
                      'Resolvido',
                      'Fechado'
                    )),
  setor_destino_id INTEGER NOT NULL,
  solicitante_id   INTEGER NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_updated_at ON tickets;
CREATE TRIGGER trg_set_updated_at
BEFORE UPDATE ON tickets
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS ticket_comments (
  id         SERIAL PRIMARY KEY,
  ticket_id  INT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  author_id  INT NOT NULL,
  mensagem   TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_comments_ticket_id ON ticket_comments(ticket_id);

INSERT INTO tickets (titulo, descricao, status, setor_destino_id, solicitante_id)
VALUES ('Erro na tela', 'Não carrega', 'Aberto', 2, 1)
ON CONFLICT DO NOTHING;

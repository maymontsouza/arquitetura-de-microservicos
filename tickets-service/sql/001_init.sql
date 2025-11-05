DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'chamado_status') THEN
    CREATE TYPE chamado_status AS ENUM ('Aberto','Em Andamento','Aguardando Resposta','Resolvido','Fechado');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS chamado (
  id SERIAL PRIMARY KEY,
  titulo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  status chamado_status NOT NULL DEFAULT 'Aberto',
  setor_destino_id INT NOT NULL,
  solicitante_id INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION trg_set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON chamado;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON chamado
FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

CREATE TABLE IF NOT EXISTS comentario (
  id SERIAL PRIMARY KEY,
  chamado_id INT NOT NULL REFERENCES chamado(id) ON DELETE CASCADE,
  autor_id INT NOT NULL,
  mensagem TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

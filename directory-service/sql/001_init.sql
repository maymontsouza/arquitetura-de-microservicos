CREATE TABLE IF NOT EXISTS setor (
  id   SERIAL PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS employees (
  id                SERIAL PRIMARY KEY,
  nome              TEXT NOT NULL,
  email             TEXT NOT NULL UNIQUE,
  cargo             TEXT NOT NULL,
  setor_id          INTEGER REFERENCES setor(id),
  origem_usuario_id INTEGER
);

INSERT INTO setor (nome) VALUES
  ('TI'),
  ('Atendimento')
ON CONFLICT (nome) DO NOTHING;

INSERT INTO employees (nome, email, cargo, setor_id, origem_usuario_id)
VALUES ('May', 'may@example.com', 'QA', 1, NULL)
ON CONFLICT (email) DO NOTHING;

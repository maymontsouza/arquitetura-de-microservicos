CREATE TABLE IF NOT EXISTS setor (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS funcionario (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  setor_id INT NOT NULL REFERENCES setor(id),
  cargo TEXT NOT NULL
);

INSERT INTO setor (nome) VALUES
  ('TI'),
  ('Atendimento')
ON CONFLICT DO NOTHING;

INSERT INTO funcionario (nome, email, setor_id, cargo) VALUES
  ('May', 'may@example.com', 1, 'QA')
ON CONFLICT DO NOTHING;

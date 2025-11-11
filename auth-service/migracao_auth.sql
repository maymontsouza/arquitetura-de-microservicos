ALTER TABLE users
  ADD COLUMN IF NOT EXISTS tipo_usuario TEXT,
  ADD COLUMN IF NOT EXISTS setor TEXT,
  ADD COLUMN IF NOT EXISTS cargo TEXT;

UPDATE users
SET
  tipo_usuario = COALESCE(UPPER(tipo_usuario), 'USUARIO'),
  setor = COALESCE(setor, 'N/A'),
  cargo = COALESCE(cargo, 'N/A');

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_tipo_usuario_check'
  ) THEN
    ALTER TABLE users
    ADD CONSTRAINT users_tipo_usuario_check
      CHECK (tipo_usuario IN ('ADMIN','USUARIO','SUPORTE'));
  END IF;
END$$;

ALTER TABLE users
  ALTER COLUMN tipo_usuario SET NOT NULL,
  ALTER COLUMN setor SET NOT NULL,
  ALTER COLUMN cargo SET NOT NULL;

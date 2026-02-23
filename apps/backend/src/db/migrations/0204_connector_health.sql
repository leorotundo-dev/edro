-- Adiciona campos de saúde ao connector para rastrear status real da conexão.
-- "Conectado" no UI não significa "funcionando" — agora é possível saber se
-- o token expirou, foi revogado ou a conta foi desconectada.

ALTER TABLE connectors ADD COLUMN IF NOT EXISTS last_sync_ok    BOOLEAN;
ALTER TABLE connectors ADD COLUMN IF NOT EXISTS last_sync_at    TIMESTAMPTZ;
ALTER TABLE connectors ADD COLUMN IF NOT EXISTS last_error      TEXT;
ALTER TABLE connectors ADD COLUMN IF NOT EXISTS last_error_at   TIMESTAMPTZ;

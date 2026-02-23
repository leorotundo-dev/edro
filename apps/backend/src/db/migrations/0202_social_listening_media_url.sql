-- Adiciona coluna media_url em social_listening_mentions
-- para persistir a URL da imagem de posts do Instagram (Meta Graph API)
ALTER TABLE social_listening_mentions
  ADD COLUMN IF NOT EXISTS media_url TEXT NULL;

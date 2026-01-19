-- 0036_user_profile_fields.sql
-- Campos basicos de perfil do usuario

ALTER TABLE users
ADD COLUMN IF NOT EXISTS timezone TEXT;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS language TEXT;

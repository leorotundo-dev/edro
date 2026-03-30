ALTER TABLE freelancer_profiles
  DROP CONSTRAINT IF EXISTS freelancer_profiles_pix_key_type_check;

ALTER TABLE freelancer_profiles
  ADD CONSTRAINT freelancer_profiles_pix_key_type_check
  CHECK (pix_key_type IN ('cnpj', 'cpf', 'email', 'telefone', 'aleatoria'));

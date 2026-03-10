-- Dados pessoais e bancários do freelancer
ALTER TABLE freelancer_profiles ADD COLUMN IF NOT EXISTS cpf TEXT;
ALTER TABLE freelancer_profiles ADD COLUMN IF NOT EXISTS rg TEXT;
ALTER TABLE freelancer_profiles ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE freelancer_profiles ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE freelancer_profiles ADD COLUMN IF NOT EXISTS bank_agency TEXT;
ALTER TABLE freelancer_profiles ADD COLUMN IF NOT EXISTS bank_account TEXT;

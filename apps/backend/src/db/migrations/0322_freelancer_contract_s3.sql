-- Migration 0322: Add S3 key columns for freelancer contracts
-- Separates the permanent S3 storage key from the D4Sign URL

ALTER TABLE freelancer_profiles
  ADD COLUMN IF NOT EXISTS contract_unsigned_s3_key TEXT,
  ADD COLUMN IF NOT EXISTS contract_signed_s3_key   TEXT;

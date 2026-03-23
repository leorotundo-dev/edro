-- Migration 0297: Seed freelancer profile for leo.rotundo@gmail.com
-- One-time setup to allow testing the freelancer portal.
-- All inserts are idempotent (ON CONFLICT DO NOTHING).

DO $$
DECLARE
  v_user_id UUID;
  v_tenant_id UUID := '81fe2f7f-69d7-441a-9a2e-5c4f5d4c5cc5';
BEGIN
  -- 1. Ensure user exists in edro_users
  INSERT INTO edro_users (email, name, role, status)
  VALUES ('leo.rotundo@gmail.com', 'Leonardo Rotundo', 'staff', 'active')
  ON CONFLICT (email) DO NOTHING;

  SELECT id INTO v_user_id FROM edro_users WHERE LOWER(email) = 'leo.rotundo@gmail.com';

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Could not find or create user leo.rotundo@gmail.com';
  END IF;

  -- 2. Ensure tenant membership
  INSERT INTO tenant_users (tenant_id, user_id, role)
  VALUES (v_tenant_id, v_user_id, 'staff')
  ON CONFLICT (tenant_id, user_id) DO NOTHING;

  -- 3. Ensure freelancer profile
  INSERT INTO freelancer_profiles (user_id, display_name, specialty, is_active)
  VALUES (v_user_id, 'Leonardo Rotundo', 'estrategia', true)
  ON CONFLICT (user_id) DO NOTHING;
END $$;

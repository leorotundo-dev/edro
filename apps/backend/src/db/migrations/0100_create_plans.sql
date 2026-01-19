-- 0100_create_plans.sql
-- Create plans catalog for subscriptions and paywall

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'r'
      AND c.relname = 'plans'
      AND n.nspname = 'public'
  ) THEN
    IF EXISTS (
      SELECT 1
      FROM pg_type t
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE t.typname = 'plans'
        AND n.nspname = 'public'
    ) THEN
      DROP TYPE IF EXISTS public.plans;
    END IF;

    CREATE TABLE public.plans (
      code TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      price_cents INTEGER,
      duration_days INTEGER,
      features JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS plans_price_cents_idx ON public.plans (price_cents);

INSERT INTO public.plans (code, name, price_cents, duration_days, features, created_at, updated_at)
VALUES
  ('FREE', 'Plano Gratuito', 0, NULL, '["10 drops por mes", "Acesso basico"]'::jsonb, NOW(), NOW()),
  ('PREMIUM_MONTH', 'Premium Mensal', 4990, 30, '["Drops ilimitados", "Simulados", "Suporte prioritario"]'::jsonb, NOW(), NOW()),
  ('PREMIUM_YEAR', 'Premium Anual', 47990, 365, '["Drops ilimitados", "Simulados", "Suporte prioritario", "20% desconto"]'::jsonb, NOW(), NOW())
ON CONFLICT (code) DO NOTHING;

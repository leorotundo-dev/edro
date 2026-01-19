-- 0013_fix_jobs_scheduled_for.sql
-- Adiciona coluna scheduled_for caso não existe

-- Adicionar coluna scheduled_for se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'jobs' 
    AND column_name = 'scheduled_for'
  ) THEN
    ALTER TABLE jobs ADD COLUMN scheduled_for TIMESTAMPTZ;
    CREATE INDEX idx_jobs_scheduled ON jobs(scheduled_for);
  END IF;
END $$;

-- Garantir que os índices existem
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_type ON jobs(type);
CREATE INDEX IF NOT EXISTS idx_jobs_priority ON jobs(priority DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_scheduled ON jobs(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_jobs_created ON jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_queue ON jobs(status, priority DESC, created_at ASC) 
  WHERE status = 'pending';

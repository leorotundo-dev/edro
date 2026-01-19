-- ============================================
-- MANUAL FIX: Add scheduled_for column to jobs table
-- ============================================
-- Run this SQL directly on your database if you need an immediate fix
-- without restarting the backend container.

-- Step 1: Add the missing column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'jobs' 
    AND column_name = 'scheduled_for'
  ) THEN
    ALTER TABLE jobs ADD COLUMN scheduled_for TIMESTAMPTZ;
    RAISE NOTICE 'Column scheduled_for added successfully';
  ELSE
    RAISE NOTICE 'Column scheduled_for already exists';
  END IF;
END $$;

-- Step 2: Create index for the column (if doesn't exist)
CREATE INDEX IF NOT EXISTS idx_jobs_scheduled ON jobs(scheduled_for);

-- Step 3: Ensure all other important indexes exist
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_type ON jobs(type);
CREATE INDEX IF NOT EXISTS idx_jobs_priority ON jobs(priority DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_created ON jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_queue ON jobs(status, priority DESC, created_at ASC) 
  WHERE status = 'pending';

-- Step 4: Verify the column exists
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'jobs' 
  AND column_name = 'scheduled_for';

-- Expected output:
--  column_name  |        data_type         | is_nullable
-- --------------+--------------------------+-------------
--  scheduled_for | timestamp with time zone | YES

-- Step 5: Check if the migration is registered
-- (Optional - this registers it in the migration tracker)
INSERT INTO schema_migrations (name)
VALUES ('0013_fix_jobs_scheduled_for.sql')
ON CONFLICT (name) DO NOTHING;

-- Done! Now restart your backend service for the changes to take effect.

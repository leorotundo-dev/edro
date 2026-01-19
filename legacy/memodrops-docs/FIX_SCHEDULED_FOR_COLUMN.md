# Fix: Missing `scheduled_for` Column in Jobs Table

## Problem
The job worker is failing with the error:
```
error: column "scheduled_for" does not exist
```

This happens because the `jobs` table is missing the `scheduled_for` column that the code expects.

## Root Cause
The migration `0011_jobs_system.sql` uses `CREATE TABLE IF NOT EXISTS`, which means if the table already existed (possibly created earlier without all columns), the migration wouldn't add the missing columns.

## Solution

### Option 1: Restart Backend (Automatic Migration)
A new migration file has been created: `0013_fix_jobs_scheduled_for.sql`

**Steps:**
1. The migration file is already in place at: 
   `apps/backend/src/db/migrations/0013_fix_jobs_scheduled_for.sql`
   
2. Simply restart your backend container:
   ```bash
   # Stop the container
   docker-compose down
   
   # Start it again
   docker-compose up -d
   ```

3. Check the logs to confirm the migration ran:
   ```bash
   docker-compose logs backend | grep "0013_fix_jobs_scheduled_for"
   ```
   
   You should see:
   ```
   ✅ Migração 0013_fix_jobs_scheduled_for.sql aplicada com sucesso!
   ```

4. The job worker errors should stop appearing.

### Option 2: Manual Database Fix (Immediate)
If you need an immediate fix without restarting, run this SQL directly on your database:

```sql
-- Connect to your database
-- psql -h your-host -U your-user -d your-database

-- Add the missing column
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
```

Then restart the backend to pick up the changes.

## Verification

After applying the fix, verify the column exists:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'jobs' 
AND column_name = 'scheduled_for';
```

Expected output:
```
 column_name  |       data_type        
--------------+------------------------
 scheduled_for| timestamp with time zone
```

## What the Migration Does

The migration `0013_fix_jobs_scheduled_for.sql`:

1. ✅ Checks if the `scheduled_for` column exists
2. ✅ Adds it if missing (TIMESTAMPTZ type)
3. ✅ Creates the necessary index
4. ✅ Ensures all other job-related indexes exist
5. ✅ Is idempotent (safe to run multiple times)

## Expected Result

After the fix:
- ✅ No more `column "scheduled_for" does not exist` errors
- ✅ Job worker will start processing jobs successfully
- ✅ Scheduled jobs will work properly
- ✅ The cron scheduler will function correctly

## Technical Details

### Files Modified/Created:
- ✅ Created: `apps/backend/src/db/migrations/0013_fix_jobs_scheduled_for.sql`

### Database Changes:
- ✅ Column added: `jobs.scheduled_for` (TIMESTAMPTZ)
- ✅ Index added: `idx_jobs_scheduled`

### Code References:
- **Job Service**: `apps/backend/src/services/jobService.ts` (line 69)
- **Migration System**: `apps/backend/src/migrate.ts`
- **Original Migration**: `apps/backend/src/db/migrations/0011_jobs_system.sql`

## Recommendation

**Use Option 1 (Restart Backend)** - This is the cleanest approach as it:
- Runs the migration through the proper migration system
- Gets tracked in `schema_migrations` table
- Ensures consistency with your migration history
- Requires minimal manual intervention

The error will stop occurring immediately after the restart and successful migration.

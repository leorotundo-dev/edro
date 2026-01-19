# ✅ Fix Applied: Job Worker `scheduled_for` Column Issue

## 🔍 Problem Identified
Your backend logs showed repeated errors:
```
[jobs] Erro no worker: error: column "scheduled_for" does not exist
```

## 🛠️ Solution Applied

### Files Created:
1. ✅ **Migration File**: `apps/backend/src/db/migrations/0013_fix_jobs_scheduled_for.sql`
   - Adds the missing `scheduled_for` column
   - Creates necessary indexes
   - Safe to run multiple times (idempotent)

2. ✅ **Documentation**: `FIX_SCHEDULED_FOR_COLUMN.md`
   - Detailed explanation of the problem and solutions

3. ✅ **Quick Fix Scripts**:
   - `QUICK_FIX.sh` (Linux/Mac)
   - `QUICK_FIX.ps1` (Windows PowerShell)

4. ✅ **Manual SQL**: `MANUAL_SQL_FIX.sql`
   - Direct database fix if needed

## 🚀 How to Apply the Fix

### Recommended: Automatic Migration (Restart Backend)

Choose your platform:

**Linux/Mac:**
```bash
chmod +x QUICK_FIX.sh
./QUICK_FIX.sh
```

**Windows PowerShell:**
```powershell
.\QUICK_FIX.ps1
```

**Manual (any platform):**
```bash
# Stop backend
docker-compose stop backend

# Start backend (migration will run automatically)
docker-compose up -d backend

# Check logs
docker-compose logs -f backend
```

### Alternative: Manual Database Fix

If you need an immediate fix without restarting:

1. Connect to your database
2. Run the SQL from `MANUAL_SQL_FIX.sql`
3. Restart backend when convenient

## ✅ Expected Results

After applying the fix, you should see:

### In the logs:
```
🔄 Executando migração 0013_fix_jobs_scheduled_for.sql...
✅ Migração 0013_fix_jobs_scheduled_for.sql aplicada com sucesso!
```

### No more errors like:
```
❌ [jobs] Erro no worker: error: column "scheduled_for" does not exist
```

### Job worker functioning:
```
✅ [jobs] 🚀 Job worker iniciado
✅ [scheduler] ✅ Scheduler inicializado com sucesso
```

## 🔍 Verification

To verify the fix was applied correctly:

```sql
-- Check if column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'jobs' 
  AND column_name = 'scheduled_for';

-- Check if migration was recorded
SELECT * FROM schema_migrations 
WHERE name = '0013_fix_jobs_scheduled_for.sql';
```

## 📋 What This Fixes

- ✅ Job worker will start without errors
- ✅ Scheduled jobs can be created and executed
- ✅ Job scheduler (cron) will work properly
- ✅ Jobs can be scheduled for future execution
- ✅ Job retry mechanism will work correctly

## 🔧 Technical Details

### The Missing Column
The `jobs` table was created without the `scheduled_for` column, which is required by:
- `jobService.ts` line 69: `getNextJob()` function
- Job scheduling system
- Cron job scheduler

### Why This Happened
The original migration (`0011_jobs_system.sql`) uses `CREATE TABLE IF NOT EXISTS`, which doesn't alter existing tables. If the `jobs` table existed before the migration, the column was never added.

### The Fix
Migration `0013_fix_jobs_scheduled_for.sql`:
```sql
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'jobs' 
    AND column_name = 'scheduled_for'
  ) THEN
    ALTER TABLE jobs ADD COLUMN scheduled_for TIMESTAMPTZ;
    CREATE INDEX idx_jobs_scheduled ON jobs(scheduled_for);
  END IF;
END $$;
```

## 📞 Need Help?

If you encounter any issues:

1. Check the logs:
   ```bash
   docker-compose logs backend | grep -i "scheduled_for"
   ```

2. Verify database connection:
   ```bash
   docker-compose exec backend psql -c "SELECT version();"
   ```

3. Check if migration ran:
   ```bash
   docker-compose logs backend | grep "0013_fix_jobs_scheduled_for"
   ```

## 📚 Related Files

- **Job Service**: `apps/backend/src/services/jobService.ts`
- **Migration System**: `apps/backend/src/migrate.ts`
- **Original Jobs Migration**: `apps/backend/src/db/migrations/0011_jobs_system.sql`
- **Fix Migration**: `apps/backend/src/db/migrations/0013_fix_jobs_scheduled_for.sql`

---

**Status**: ✅ Fix ready to apply
**Action Required**: Restart backend container
**Expected Downtime**: ~10-30 seconds
**Risk Level**: Low (migration is idempotent and reversible)

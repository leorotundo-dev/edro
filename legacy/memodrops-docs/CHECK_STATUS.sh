#!/bin/bash

# Check Status Script
# Verifies if the scheduled_for fix has been applied

echo "🔍 Checking job worker status..."
echo ""

echo "📋 1. Checking if backend is running..."
docker-compose ps backend

echo ""
echo "📋 2. Checking recent backend logs..."
docker-compose logs --tail=50 backend | tail -20

echo ""
echo "📋 3. Checking for scheduled_for errors (last 100 lines)..."
ERROR_COUNT=$(docker-compose logs --tail=100 backend | grep -c "scheduled_for does not exist")
if [ $ERROR_COUNT -gt 0 ]; then
  echo "❌ Found $ERROR_COUNT errors mentioning 'scheduled_for'"
  echo "   The fix has NOT been applied yet."
  echo ""
  echo "   Run the fix with: ./QUICK_FIX.sh"
else
  echo "✅ No scheduled_for errors found!"
  echo "   The fix appears to be working."
fi

echo ""
echo "📋 4. Checking if migration was applied..."
docker-compose logs backend | grep "0013_fix_jobs_scheduled_for" | tail -5

echo ""
echo "📋 5. Job worker status..."
JOB_WORKER=$(docker-compose logs --tail=50 backend | grep "Job worker" | tail -1)
if [ -z "$JOB_WORKER" ]; then
  echo "⚠️  No job worker status found in recent logs"
else
  echo "$JOB_WORKER"
fi

echo ""
echo "📋 6. Scheduler status..."
SCHEDULER=$(docker-compose logs --tail=50 backend | grep "scheduler" | tail -1)
if [ -z "$SCHEDULER" ]; then
  echo "⚠️  No scheduler status found in recent logs"
else
  echo "$SCHEDULER"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Summary:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $ERROR_COUNT -eq 0 ]; then
  echo "✅ System Status: HEALTHY"
  echo "   No scheduled_for errors detected"
else
  echo "❌ System Status: NEEDS FIX"
  echo "   Found $ERROR_COUNT scheduled_for errors"
  echo ""
  echo "   To fix, run: ./QUICK_FIX.sh"
fi
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

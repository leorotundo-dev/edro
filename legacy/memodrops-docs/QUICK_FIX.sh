#!/bin/bash

# Quick Fix for scheduled_for column issue
# This script will restart the backend to apply the new migration

echo "🔧 Fixing scheduled_for column issue..."
echo ""
echo "📋 Step 1: Stopping backend container..."
docker-compose stop backend

echo ""
echo "📋 Step 2: Starting backend container..."
docker-compose up -d backend

echo ""
echo "📋 Step 3: Waiting for backend to start (10 seconds)..."
sleep 10

echo ""
echo "📋 Step 4: Checking logs for migration..."
docker-compose logs backend | grep -A 2 "0013_fix_jobs_scheduled_for"

echo ""
echo "📋 Step 5: Checking for job worker errors..."
echo "If you see errors below, the fix didn't work:"
docker-compose logs --tail=20 backend | grep -i "scheduled_for"

echo ""
echo "✅ Fix applied! Check the output above."
echo ""
echo "To monitor logs in real-time:"
echo "  docker-compose logs -f backend"

# 🚨 URGENT: Backend Missing Environment Variables

## ❌ The Problem

The backend is crashing because **required environment variables are missing**:

```
DATABASE_URL - Required
JWT_SECRET - Required
```

---

## ✅ SOLUTION: Add Environment Variables in Railway

### Step 1: Go to Backend Service
```
https://railway.app
→ memodrops project
→ @edro/backend service
→ Settings
→ Variables
```

### Step 2: Add These Required Variables

**Click "New Variable" and add each one:**

#### 1. DATABASE_URL
```
DATABASE_URL=postgresql://user:password@host:port/database
```
**Example:**
```
DATABASE_URL=postgresql://postgres:mypassword@postgres.railway.internal:5432/memodrops
```

**If you have a Railway Postgres database:**
- Railway auto-generates this
- Look for "DATABASE_URL" in the Postgres service variables
- Copy it to the backend service

#### 2. JWT_SECRET
```
JWT_SECRET=your-super-secret-key-here
```
**Generate a secure random string:**
```bash
# On Linux/Mac:
openssl rand -base64 32

# Or use any random string (minimum 32 characters):
JWT_SECRET=my-super-secret-jwt-key-change-this-in-production-123456789
```

#### 3. Other Required Variables (Recommended)

```
NODE_ENV=production
PORT=3333
REDIS_URL=redis://default:password@redis.railway.internal:6379
OPENAI_API_KEY=sk-your-openai-key-here
ALLOWED_ORIGINS=https://your-frontend-url.railway.app
```

---

## 📋 Complete Environment Variables Checklist

### Required (App will crash without these):
- [ ] `DATABASE_URL` - PostgreSQL connection string
- [ ] `JWT_SECRET` - Secret key for JWT tokens

### Important (App may work but with limited functionality):
- [ ] `REDIS_URL` - Redis connection for caching
- [ ] `OPENAI_API_KEY` - For AI features
- [ ] `NODE_ENV` - Set to "production"
- [ ] `PORT` - Set to "3333"
- [ ] `ALLOWED_ORIGINS` - Frontend URL for CORS

---

## 🔧 How to Get DATABASE_URL from Railway Postgres

### Option 1: Copy from Postgres Service

1. In Railway Dashboard, click on your **Postgres** service
2. Go to **"Variables"** tab
3. Find **"DATABASE_URL"** variable
4. **Copy** the entire value
5. Go to **@edro/backend** service
6. Add new variable: `DATABASE_URL` = (paste the value)

### Option 2: Use Railway's Auto-Generated Variable

If your Postgres is in the same Railway project:
```
DATABASE_URL=${{Postgres.DATABASE_URL}}
```

Railway will auto-replace this with the actual Postgres URL.

---

## 🎯 Expected Result After Adding Variables

Once you add the variables and redeploy:

```
✓ Environment variables loaded
✓ Database connected
✓ Redis connected
✓ Server started on port 3333
✓ Ready to accept connections
```

**Status**: 🟢 Active/Deployed

---

## ⚠️ Current Error vs Success

### Current (Missing Env Vars):
```
❌ ZodError: [
     { code: 'invalid_type', expected: 'string', received: 'undefined', path: ['DATABASE_URL'] }
     { code: 'invalid_type', expected: 'string', received: 'undefined', path: ['JWT_SECRET'] }
   ]
❌ ELIFECYCLE Command failed with exit code 1
```

### After Adding Env Vars:
```
✓ [INFO] Server listening on port 3333
✓ [INFO] Database connected
✓ [INFO] Ready to accept requests
```

---

## 🚀 Quick Copy-Paste Template

Add these variables in Railway Dashboard > @edro/backend > Settings > Variables:

```
DATABASE_URL=postgresql://postgres:PASSWORD@HOST:5432/DATABASE_NAME
JWT_SECRET=your-secret-key-minimum-32-characters-long-change-this
NODE_ENV=production
PORT=3333
```

Replace:
- `PASSWORD` - Your postgres password
- `HOST` - Your postgres host (usually ends with .railway.internal)
- `DATABASE_NAME` - Your database name (probably "memodrops")
- `your-secret-key...` - Generate a secure random string

---

## ⏰ Time Required: 2 minutes

This is just adding environment variables - very quick!

---

**Status**: 🔴 **URGENT - Missing Required Environment Variables**  
**Action**: Add DATABASE_URL and JWT_SECRET in Railway Dashboard NOW

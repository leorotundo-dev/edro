# 🚀 Fix @edro/web-aluno - Railway Configuration

## ✅ Code Changes: DONE ✓

I've already fixed:
- ✅ Optimized Dockerfile (multi-stage build)
- ✅ Updated package.json (port configuration)
- ✅ Next.js config is already clean

---

## 🎯 YOU NEED TO DO: Railway Dashboard Configuration

**Same exact issue as web app - Railway is using Nixpacks instead of Docker!**

---

## 📋 STEP-BY-STEP:

### 1. Go to Railway Dashboard
```
https://railway.app
→ memodrops project
→ @edro/web-aluno service
→ Settings
```

### 2. Change Build Settings

**Builder**: Change to **"DOCKERFILE"**

**Dockerfile Path**: Set to **`apps/web-aluno/Dockerfile`**

**Root Directory**: Empty or `/`

**Build Command**: EMPTY (clear it)

**Start Command**: EMPTY (clear it)

### 3. Environment Variables

Make sure these exist in Settings > Variables:

```
NODE_ENV=production
PORT=3333
NEXT_PUBLIC_API_URL=<your-backend-url>
```

### 4. Redeploy

Click **"Deployments"** → **"Redeploy"**

---

## ✅ Expected Success Logs:

```
✓ Building with Dockerfile
✓ Step 1/20 : FROM node:18-alpine AS deps
✓ Step 10/20 : RUN pnpm run build
✓ > @edro/web-aluno@1.0.0 build
✓ > next build
✓ Creating an optimized production build
✓ ✓ Compiled successfully
✓ Ready in 2s
```

---

## ❌ What You're Currently Seeing (Wrong):

```
✗ WARN   Local package.json exists, but node_modules missing
✗ sh: next: not found
✗ ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL
```

This means Railway is **NOT building**, just trying to start.

---

## 📝 Summary:

| Setting | Current (Wrong) | Correct |
|---------|----------------|---------|
| Builder | Nixpacks | **DOCKERFILE** |
| Dockerfile Path | (empty) | **apps/web-aluno/Dockerfile** |
| Build Command | (maybe set) | **(empty)** |
| Start Command | (maybe set) | **(empty)** |

---

## ⚡ This is a 2-minute fix!

The code is ready and pushed. Just change Railway settings and redeploy! 🚀

---

**Status**: Code ✅ | Railway Dashboard Config ⏳

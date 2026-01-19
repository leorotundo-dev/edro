# ⚡ Railway Quick Fix Guide - @edro/web

## 🎯 Current Issue
Your Next.js web app is crashing on Railway with:
- ❌ Invalid next.config.mjs options
- ❌ Missing BUILD_ID (build not completing)

## ✅ What Was Fixed

### 1. Configuration Issues (FIXED ✅)
```diff
// apps/web/next.config.mjs
- experimental: { appDir: true }  ❌ Deprecated
- styledComponents: false          ❌ Invalid
+ compiler: { styledComponents: false }  ✅ Valid
```

### 2. Dockerfile Optimized (FIXED ✅)
- Multi-stage build for reliability
- Better error handling
- Proper port configuration (3333)
- Security improvements (non-root user)

### 3. Start Command (FIXED ✅)
```json
// apps/web/package.json
"start": "next start -p ${PORT:-3333}"
```

---

## 🚀 Railway Deployment Steps

### Option A: Automatic Deployment (Recommended)
**Just push the changes:**
```bash
cd memodrops-main
git add .
git commit -m "fix: resolve Next.js config and build issues"
git push origin main
```

Railway will automatically:
1. Detect the changes
2. Use `apps/web/Dockerfile` (via railway.json)
3. Build the app
4. Deploy successfully ✅

---

### Option B: Manual Verification in Railway Dashboard

1. **Go to Railway Dashboard**
   - Navigate to: https://railway.app
   - Select project: `memodrops`
   - Click service: `@edro/web`

2. **Verify Settings > Build**
   ```
   Builder: DOCKERFILE
   Dockerfile Path: apps/web/Dockerfile
   Root Directory: (leave empty or set to /)
   ```

3. **Verify Settings > Variables**
   Add these if missing:
   ```
   NODE_ENV=production
   PORT=3333
   NEXT_PUBLIC_API_URL=<your-backend-url>
   ```

4. **Trigger Redeploy**
   - Go to Deployments tab
   - Click "New Deployment" or "Redeploy"
   - Watch the logs

---

## 📊 Expected Build Log (Success)

```
[build] Building with Dockerfile
[build] Step 1/20 : FROM node:18-alpine AS deps
[build] ...
[build] Step 10/20 : RUN pnpm run build
[build] > @edro/web@0.1.0 build
[build] > next build
[build] 
[build]   ▲ Next.js 14.1.0
[build] 
[build]    Creating an optimized production build ...
[build] ✓ Compiled successfully
[build] 
[build] Step 20/20 : CMD ["pnpm", "run", "start"]
[deploy] Starting service...
[deploy]   ▲ Next.js 14.1.0
[deploy]   - Local:        http://localhost:3333
[deploy] ✓ Ready in 2s
```

**Key indicators of success:**
- ✅ "Compiled successfully"
- ✅ "Ready in X seconds"
- ✅ No config warnings
- ✅ No BUILD_ID errors

---

## 🐛 If Still Failing

### Check 1: Railway.json Configuration
Ensure `apps/web/railway.json` exists and contains:
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "apps/web/Dockerfile"
  },
  "deploy": {
    "healthcheckPath": "/",
    "healthcheckTimeout": 100,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### Check 2: Environment Variables
In Railway Dashboard > Settings > Variables, add:
```
NODE_ENV=production
PORT=3333
NEXT_PUBLIC_API_URL=https://your-backend-url.railway.app
```

### Check 3: Build Command Override
In Railway Dashboard > Settings > Build:
- **Make sure there's NO custom "Build Command"**
- Let the Dockerfile handle everything
- Delete any override if present

### Check 4: Start Command Override
In Railway Dashboard > Settings > Deploy:
- **Make sure there's NO custom "Start Command"**
- Let the Dockerfile CMD handle it
- Delete any override if present

---

## 🔄 Common Railway Issues & Solutions

### Issue: "Builder type not specified"
**Solution:** Check that `railway.json` has `"builder": "DOCKERFILE"`

### Issue: "Dockerfile not found"
**Solution:** Verify `dockerfilePath: "apps/web/Dockerfile"` in railway.json

### Issue: Build succeeds but app crashes on start
**Possible causes:**
1. Missing environment variables (especially `PORT`)
2. Start command not finding pnpm
3. .next directory not copied correctly

**Solution:** The new Dockerfile fixes all these issues

### Issue: Port binding error
**Solution:** Ensure `PORT=3333` is set in Railway variables

---

## 📝 Quick Checklist

Before deployment:
- [x] ✅ `apps/web/next.config.mjs` - Fixed (no deprecated options)
- [x] ✅ `apps/web/Dockerfile` - Optimized (multi-stage build)
- [x] ✅ `apps/web/package.json` - Start script uses PORT variable
- [x] ✅ `apps/web/railway.json` - Correct configuration
- [ ] ⚠️ Push changes to repository
- [ ] ⚠️ Verify Railway environment variables
- [ ] ⚠️ Monitor deployment logs

After deployment:
- [ ] No config warnings in logs
- [ ] Build completes successfully
- [ ] App starts and shows "Ready"
- [ ] Health check passes
- [ ] Can access the application

---

## 🎉 Expected Result

After applying these fixes and deploying:

```
✅ @edro/backend - Online
✅ @edro/web - Online (was crashed)
✅ @edro/web-aluno - Online
✅ @edro/ai - Online
```

Your web app should now:
- Build without warnings
- Start successfully
- Respond to health checks
- Be accessible via Railway URL

---

## 💡 Pro Tips

1. **Use Railway CLI for faster debugging:**
   ```bash
   npm install -g @railway/cli
   railway login
   railway logs
   ```

2. **Watch logs in real-time:**
   - Railway Dashboard > Deployments > Click deployment > View Logs
   - Or use `railway logs --follow`

3. **Test locally first:**
   ```bash
   docker build -t memodrops-web -f apps/web/Dockerfile .
   docker run -p 3000:3333 -e PORT=3333 memodrops-web
   ```

---

## 📞 Need More Help?

If the deployment still fails after these fixes:
1. Copy the full build logs from Railway
2. Copy the deployment logs
3. Check for any error messages
4. Verify all environment variables are set

The fixes applied should resolve the issues you were experiencing!

---

**Status:** ✅ Ready to deploy
**Last Updated:** 2024-12-05

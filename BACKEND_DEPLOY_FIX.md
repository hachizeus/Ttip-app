# 🚀 Backend Deployment - FIX

## ❌ **Issue:**
Render tried to deploy entire TTip app (Expo) causing memory error

## ✅ **Solution:**

### 1. **Create New GitHub Repository:**
- Go to GitHub.com
- Create new repository: `ttip-backend`
- Make it public

### 2. **Push Backend Only:**
```bash
cd mpesa-express-backend
git remote set-url origin https://github.com/hachizeus/ttip-backend.git
git push -u origin main
```

### 3. **Deploy on Render:**
- Connect `ttip-backend` repository (not TTip)
- Build: `npm install`
- Start: `npm start`
- Environment: Node.js

### 4. **Environment Variables:**
```
SUPABASE_URL=https://cpbonffjhrckiiqbsopt.supabase.co
SUPABASE_SERVICE_KEY=your_key
MPESA_CONSUMER_KEY=your_key
MPESA_CONSUMER_SECRET=your_secret
INFOBIP_API_KEY=TLOqcDmWPfujtChtXlJBOZncdWdkcMbdLSUhzFLRgMJTSgUNZiaBIsQsHqzetv
```

**Deploy backend only, not the entire app!** 🎯📱
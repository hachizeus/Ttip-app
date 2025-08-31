# 🚀 Deploy Backend to Render

## 📋 **Deployment Steps:**

### 1. **Create GitHub Repository:**
```bash
cd mpesa-express-backend
git init
git add .
git commit -m "Initial backend commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/ttip-backend.git
git push -u origin main
```

### 2. **Deploy on Render:**
1. Go to [render.com](https://render.com)
2. Sign up/Login with GitHub
3. Click "New" → "Web Service"
4. Connect your `ttip-backend` repository
5. Configure:
   - **Name**: `ttip-backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`

### 3. **Add Environment Variables:**
In Render dashboard, add these environment variables:
```
SUPABASE_URL=https://cpbonffjhrckiiqbsopt.supabase.co
SUPABASE_SERVICE_KEY=your_service_key
MPESA_CONSUMER_KEY=your_mpesa_key
MPESA_CONSUMER_SECRET=your_mpesa_secret
INFOBIP_API_KEY=TLOqcDmWPfujtChtXlJBOZncdWdkcMbdLSUhzFLRgMJTSgUNZiaBIsQsHqzetv
```

### 4. **Get Render URL:**
After deployment, you'll get a URL like:
`https://ttip-backend.onrender.com`

### 5. **Update App Configuration:**
Update `.env` file:
```
EXPO_PUBLIC_BACKEND_URL=https://ttip-backend.onrender.com
```

**Your backend will be accessible from any device!** 🌐📱
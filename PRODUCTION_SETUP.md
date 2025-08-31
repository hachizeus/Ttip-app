# TTip Production Setup Guide

## 1. Supabase Setup

1. Create new Supabase project at https://supabase.com
2. Go to SQL Editor and run the entire `production-schema.sql` file
3. Go to Settings > API to get your keys:
   - Project URL
   - Anon public key
   - Service role key (for backend)

## 2. Environment Variables

### Frontend (.env)
```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_BACKEND_URL=https://your-backend-domain.com
```

### Backend (.env)
```bash
# Daraja API (Get from Safaricom Developer Portal)
BASE_URL=https://api.safaricom.co.ke  # Production
CONSUMER_KEY=your_consumer_key
CONSUMER_SECRET=your_consumer_secret
SHORT_CODE=your_paybill_number
PASSKEY=your_passkey

# Your domain callbacks
CALLBACK_URL=https://your-domain.com/api/callback
B2C_TIMEOUT_URL=https://your-domain.com/api/b2c-timeout
B2C_RESULT_URL=https://your-domain.com/api/b2c-callback

# B2C Config
B2C_SHORTCODE=your_b2c_shortcode
SECURITY_CREDENTIAL=your_security_credential
INITIATOR_NAME=your_initiator_name

# Supabase
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key

PORT=3000
```

## 3. Deploy Backend

### Option A: Railway
1. Connect GitHub repo to Railway
2. Add environment variables
3. Deploy from `mpesa-express-backend` folder

### Option B: Heroku
```bash
cd mpesa-express-backend
heroku create ttip-backend
heroku config:set CONSUMER_KEY=your_key
# ... add all env vars
git push heroku main
```

## 4. Configure Daraja API

1. Go to Safaricom Developer Portal
2. Create app and get credentials
3. Set callback URLs to your deployed backend:
   - `https://your-domain.com/api/callback`
   - `https://your-domain.com/api/b2c-callback`

## 5. Build Mobile App

```bash
# Install EAS CLI
npm install -g @expo/eas-cli

# Configure build
eas build:configure

# Build for Android
eas build --platform android

# Build for iOS
eas build --platform ios
```

## 6. Test Production

1. Register test worker
2. Generate QR code
3. Test tip flow with small amount
4. Verify database updates
5. Check M-Pesa transactions

## 7. Go Live Checklist

- [ ] Supabase database created and configured
- [ ] Backend deployed with HTTPS
- [ ] Daraja API configured with production credentials
- [ ] Mobile app built and tested
- [ ] Payment flow tested end-to-end
- [ ] Error handling and logging in place
- [ ] Backup and monitoring configured

## Production URLs Structure

- Backend: `https://ttip-backend.railway.app`
- Callbacks: `https://ttip-backend.railway.app/api/callback`
- Health: `https://ttip-backend.railway.app/health`
# 🚀 TTip Production Setup Guide

## CRITICAL: Production Environment Setup

### 1. M-Pesa Production Credentials
```env
# Replace sandbox with production
BASE_URL=https://api.safaricom.co.ke
CONSUMER_KEY=your_production_consumer_key
CONSUMER_SECRET=your_production_consumer_secret
SHORT_CODE=your_production_shortcode
PASSKEY=your_production_passkey
CALLBACK_URL=https://your-domain.com/mpesa/c2b-callback
```

### 2. Database Production Setup
```env
# Supabase Production
SUPABASE_URL=https://your-prod-project.supabase.co
SUPABASE_SERVICE_KEY=your_production_service_key
```

### 3. Security Secrets (GENERATED)
```env
# Production security secrets
WEBHOOK_SECRET=0e57ef3087aadf8b07da0a83fd574c18f3fc145a06f9def9e0f4afbd9edfd634
JWT_SECRET=25f98f9e6e80da5e4a360d3ef1ad1d8dcc5d8477391db87ffa6dab673be7b64c
ENCRYPTION_KEY=b07365559c66ccffe80a1e4026a6d9816f755d53f2969ace7acec39c6d782973
```

### 4. SSL Certificate
- Domain with valid SSL certificate
- HTTPS everywhere (required for M-Pesa)

### 5. Production Deployment
```bash
# Windows
npm install --omit=dev
set NODE_ENV=production && npm start

# Linux/Mac
npm install --omit=dev
NODE_ENV=production npm start
```

## IMMEDIATE ACTIONS NEEDED:

1. **Get M-Pesa Production API Access**
   - Apply at https://developer.safaricom.co.ke
   - Complete KYC verification
   - Get production shortcode

2. **Setup Production Database**
   - Create Supabase production project
   - Run: `node setup-phase3-db.js`
   - Setup automated backups

3. **Configure Domain & SSL**
   - Purchase domain name
   - Setup SSL certificate
   - Configure DNS

4. **Deploy to Production Server**
   - Use Render, AWS, or similar
   - Set environment variables
   - Enable monitoring

5. **Security Hardening**
   - Generate new secrets
   - Enable 2FA for admin
   - Setup rate limiting

## STATUS: Ready for production deployment with proper credentials
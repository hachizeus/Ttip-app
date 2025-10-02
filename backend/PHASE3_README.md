# 🚀 TTip Phase 3 - Enterprise-Grade Payment Platform

## Overview

TTip Phase 3 transforms the MVP into a production-ready, enterprise-grade payment platform with multi-gateway support, advanced security, fraud detection, and comprehensive monitoring.

## 🎯 Phase 3 Features

### 🌍 Multi-Gateway Payment Support
- **M-Pesa** - STK Push & C2B callbacks
- **Stripe** - Card payments & Apple Pay
- **PayPal** - Checkout integration
- **Flutterwave** - African payment methods

### 🔒 Enterprise Security
- **HMAC Webhook Validation** - Cryptographic signature verification
- **Admin 2FA** - TOTP-based two-factor authentication
- **CSRF Protection** - Cross-site request forgery prevention
- **Rate Limiting** - DDoS protection and abuse prevention
- **PII Encryption** - Data encryption at rest
- **Idempotency** - Duplicate request prevention

### 🛡️ Fraud Detection
- **Real-time Rules Engine** - Suspicious transaction detection
- **ML Integration Hooks** - Future machine learning capabilities
- **Blacklist Management** - Phone/email blocking
- **Risk Scoring** - Transaction risk assessment

### 📱 Offline-First USSD
- **USSD QR Codes** - Offline payment instructions
- **Payment Reconciliation** - Manual transaction matching
- **Printable Instructions** - Vendor stall support

### 📊 Advanced Analytics
- **Real-time Dashboard** - Transaction monitoring
- **Performance Metrics** - System health tracking
- **Fraud Analytics** - Security insights
- **ML Insights** - Behavioral analysis

### 🔍 Comprehensive Monitoring
- **Health Checks** - System status monitoring
- **Prometheus Metrics** - Performance tracking
- **Structured Logging** - Error tracking
- **Alert System** - Issue notifications

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Mobile App    │    │   Admin Web     │    │   QR Scanner    │
│  (React Native) │    │   (Next.js)     │    │   (Any Device)  │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌─────────────▼─────────────┐
                    │      API Gateway          │
                    │   (Rate Limiting,         │
                    │    Authentication)        │
                    └─────────────┬─────────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        │                       │                        │
┌───────▼───────┐    ┌─────────▼─────────┐    ┌─────────▼─────────┐
│ Payment       │    │ Security          │    │ Fraud Detection   │
│ Gateway       │    │ Service           │    │ Service           │
│ Service       │    │                   │    │                   │
└───────┬───────┘    └─────────┬─────────┘    └─────────┬─────────┘
        │                      │                        │
        └──────────────────────┼────────────────────────┘
                               │
                    ┌─────────▼─────────┐
                    │    Supabase       │
                    │   (PostgreSQL)    │
                    └───────────────────┘
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
# Copy Phase 3 package.json
cp phase3-package.json package.json

# Install dependencies
npm install
```

### 2. Database Setup

```bash
# Setup Phase 3 database schema
npm run setup-db
```

### 3. Environment Configuration

```bash
# Copy environment template
cp .env.phase3.example .env

# Edit with your credentials
nano .env
```

### 4. Generate Admin User

```bash
# Generate admin with 2FA
npm run generate-admin admin your-secure-password
```

### 5. Start Server

```bash
# Development
npm run dev

# Production
npm start
```

## 🔧 Configuration

### Payment Gateways

#### M-Pesa (Daraja)
```env
BASE_URL=https://sandbox.safaricom.co.ke
CONSUMER_KEY=your_consumer_key
CONSUMER_SECRET=your_consumer_secret
SHORT_CODE=174379
PASSKEY=your_passkey
```

#### Stripe
```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

#### PayPal
```env
PAYPAL_CLIENT_ID=your_client_id
PAYPAL_SECRET=your_secret
PAYPAL_BASE_URL=https://api.sandbox.paypal.com
```

#### Flutterwave
```env
FLUTTERWAVE_SECRET_KEY=FLWSECK_TEST-...
FLUTTERWAVE_PUBLIC_KEY=FLWPUBK_TEST-...
```

### Security Settings
```env
WEBHOOK_SECRET=your_hmac_secret
JWT_SECRET=your_jwt_secret
ENCRYPTION_KEY=your_32_char_key
FRAUD_THRESHOLD=0.7
```

## 📡 API Endpoints

### Unified Payment API
```http
POST /api/pay
Content-Type: application/json
X-CSRF-Token: timestamp
Idempotency-Key: unique-key

{
  "method": "mpesa|stripe|paypal|flutterwave",
  "workerId": "worker-id",
  "amount": 100,
  "currency": "KES",
  "customerPhone": "0712345678",
  "customerEmail": "customer@example.com"
}
```

### USSD QR Generation
```http
POST /generate-ussd-qr
{
  "workerId": "worker-id",
  "type": "ussd|paybill|offline|standard"
}
```

### Admin Authentication
```http
POST /admin/login
{
  "username": "admin",
  "password": "password",
  "totpCode": "123456"
}
```

### Webhook Endpoints
- `POST /webhooks/mpesa` - M-Pesa callbacks
- `POST /webhooks/stripe` - Stripe events
- `POST /webhooks/paypal` - PayPal notifications
- `POST /webhooks/flutterwave` - Flutterwave events

## 🧪 Testing

### Run Test Suite
```bash
npm test
```

### Manual Testing
```bash
# Test M-Pesa payment
curl -X POST http://localhost:3000/api/pay \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $(date +%s)000" \
  -H "Idempotency-Key: test-$(date +%s)" \
  -d '{
    "method": "mpesa",
    "workerId": "test-worker",
    "amount": 10,
    "customerPhone": "0708374149"
  }'

# Test health check
curl http://localhost:3000/health

# Test metrics
curl http://localhost:3000/metrics
```

## 🔍 Monitoring

### Health Check
```http
GET /health
```

Response:
```json
{
  "status": "OK",
  "uptime": 3600,
  "services": {
    "database": { "status": "healthy", "responseTime": 45 },
    "mpesa": { "status": "healthy", "responseTime": 120 }
  },
  "metrics": {
    "requests": 1250,
    "errors": 5,
    "payments": 89,
    "errorRate": "0.40"
  }
}
```

### Prometheus Metrics
```http
GET /metrics
```

Available metrics:
- `ttip_requests_total` - Total requests
- `ttip_errors_total` - Total errors
- `ttip_payments_total` - Total payments
- `ttip_fraud_flags_total` - Fraud flags
- `ttip_uptime_seconds` - Server uptime

## 🛡️ Security Features

### HMAC Webhook Validation
All webhooks are validated using HMAC-SHA256:
```javascript
const signature = crypto
  .createHmac('sha256', webhookSecret)
  .update(`${timestamp}.${JSON.stringify(payload)}`)
  .digest('hex');
```

### Admin 2FA Setup
1. Generate admin user: `npm run generate-admin`
2. Scan QR code with authenticator app
3. Use TOTP codes for login

### Rate Limiting
- Payment endpoints: 10 requests per 15 minutes
- Admin endpoints: 100 requests per 15 minutes
- Global: Configurable per endpoint

### PII Protection
- Phone numbers: `071****678`
- Emails: `us***@example.com`
- Encryption at rest for sensitive data

## 📊 Fraud Detection

### Rule Engine
1. **High Amount** - Flags transactions > KSh 10,000
2. **Velocity** - Multiple transactions in short time
3. **Pattern Detection** - Suspicious behavior analysis
4. **Blacklist** - Blocked phone numbers/emails

### ML Integration
Phase 3 includes hooks for future ML integration:
- Event tracking for model training
- Feature extraction from transaction data
- Real-time scoring pipeline ready

## 🔄 USSD & Offline Payments

### QR Code Types
- **Standard** - Web + M-Pesa deep link
- **USSD** - USSD dial code instructions
- **Paybill** - M-Pesa paybill instructions
- **Offline** - Complete offline instructions

### Reconciliation
Manual payment reconciliation for offline transactions:
```http
POST /api/ussd-reconcile
{
  "mpesaCode": "QGR7KLMX61",
  "amount": 100,
  "phoneNumber": "254712345678"
}
```

## 📈 Analytics & Insights

### Dashboard Data
- Transaction statistics
- Payment method breakdown
- Worker performance metrics
- Fraud detection stats
- Revenue analytics

### ML Insights
- Tip amount suggestions
- Fraud pattern analysis
- Peak time identification
- Worker performance trends

## 🚀 Production Deployment

### Environment Setup
1. **Database** - Supabase production instance
2. **Secrets** - Use environment variables, never hardcode
3. **SSL** - HTTPS everywhere with valid certificates
4. **Monitoring** - Set up Sentry, DataDog, or similar
5. **Backups** - Automated database backups

### Scaling Considerations
- **Load Balancer** - Multiple server instances
- **Redis** - Replace in-memory queue with Redis
- **CDN** - Static asset delivery
- **Database** - Connection pooling and read replicas

### Security Checklist
- [ ] HTTPS enabled
- [ ] Webhook signatures validated
- [ ] Admin 2FA configured
- [ ] Rate limiting active
- [ ] PII encryption enabled
- [ ] Security headers set
- [ ] Dependency scanning enabled
- [ ] Regular security audits

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation** - Check this README and inline comments
- **Issues** - Open GitHub issues for bugs
- **Security** - Email security@ttip.com for vulnerabilities
- **General** - Contact support@ttip.com

---

**🎉 TTip Phase 3 - Production-Ready Payment Platform**

*Built with ❤️ for the African market*
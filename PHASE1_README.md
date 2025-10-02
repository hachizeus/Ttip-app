# TTip Phase 1 - MVP Implementation

## 🚀 Overview

Phase 1 implements the core TTip MVP with the following features:

- **Dynamic QR Codes**: Each worker gets a unique QR with M-Pesa deep link + fallback URL
- **STK Push Integration**: Customers can pay via M-Pesa STK push
- **Auto-Payout System**: Automatic B2C payouts to workers after successful payments
- **Admin Dashboard**: Basic web interface for monitoring transactions and retrying failed payouts
- **Fallback Payment Pages**: Web-based payment interface for non-M-Pesa app users

## 🏗️ Architecture

```
Customer scans QR → STK Push OR Fallback Web Page → C2B Callback → Auto B2C Payout → Worker receives money
```

## 📋 Features Implemented

### ✅ Core Payment Flow
- [x] Dynamic QR code generation (Paybill 247247 + WorkerID)
- [x] STK push initiation via fallback web page
- [x] C2B callback handling with idempotency
- [x] Automatic B2C payout queue system
- [x] Transaction logging in Supabase

### ✅ Admin Interface
- [x] Real-time transaction monitoring
- [x] Payout queue status
- [x] Failed payout retry functionality
- [x] Worker and transaction analytics

### ✅ Security & Reliability
- [x] Rate limiting on STK push requests
- [x] CSRF protection on payment forms
- [x] Duplicate transaction prevention
- [x] Error handling and retry logic

## 🛠️ Installation

### 1. Run Setup Script
```bash
setup-phase1.bat
```

### 2. Database Setup
Execute the SQL in `phase1-schema.sql` in your Supabase SQL editor.

### 3. Environment Variables
Update your `.env` file:
```env
# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key

# M-Pesa Daraja
CONSUMER_KEY=your_consumer_key
CONSUMER_SECRET=your_consumer_secret
SHORT_CODE=your_shortcode
PASSKEY=your_passkey

# B2C (for payouts)
SECURITY_CREDENTIAL=your_security_credential
INITIATOR_NAME=your_initiator_name

# Optional
BACKEND_URL=https://your-backend-url.com
PORT=3000
```

### 4. Test Installation
```bash
npm run test
```

### 5. Start Server
```bash
npm start
```

## 📱 Usage

### For Workers
1. **Generate QR Code**:
   ```bash
   POST /generate-qr
   { "workerId": "WORKER001" }
   ```

2. **Get Existing QR**:
   ```bash
   GET /qr/WORKER001
   ```

### For Customers
1. **Scan QR Code**: Opens M-Pesa app or fallback web page
2. **Fallback Payment**: Visit `/pay/WORKER001` for web-based STK push

### For Admins
1. **Dashboard**: Open `admin-dashboard.html` in browser
2. **Monitor Transactions**: Real-time transaction status
3. **Retry Failed Payouts**: One-click retry for failed B2C payments

## 🔧 API Endpoints

### Public Endpoints
- `POST /generate-qr` - Generate QR code for worker
- `GET /qr/:workerId` - Get existing QR code
- `GET /pay/:workerId` - Fallback payment page
- `POST /api/stk-push` - Initiate STK push payment
- `GET /api/payment-status` - Check payment status
- `POST /mpesa/c2b-callback` - M-Pesa C2B callback (public)

### Admin Endpoints
- `GET /admin/queue-status` - Payout queue status
- `GET /admin/transactions` - Recent transactions
- `POST /admin/retry/:txId` - Retry failed payout

### System Endpoints
- `GET /health` - Health check with queue status

## 🧪 Testing

The test suite validates:
- Database connectivity
- Worker creation
- QR code generation
- Transaction processing
- Payout queue functionality
- Environment configuration
- M-Pesa credential validation

Run tests:
```bash
npm run test
```

## 📊 Database Schema

### Tables Created
- `workers` - Worker profiles and details
- `transactions` - C2B payment records
- `payouts` - B2C payout records
- `qr_codes` - Generated QR codes
- `reviews` - Customer reviews (future use)
- `notifications` - System notifications

### Key Relationships
- `transactions.worker_id` → `workers.id`
- `payouts.tx_id` → `transactions.id`
- `qr_codes.worker_id` → `workers.id`

## 🔄 Payment Flow

1. **QR Generation**: Worker requests QR code
2. **Customer Scan**: QR contains M-Pesa deep link + fallback URL
3. **Payment Initiation**: STK push sent to customer phone
4. **C2B Callback**: M-Pesa confirms payment
5. **Payout Queue**: B2C payout job created
6. **Auto Payout**: Worker receives money automatically
7. **Status Update**: Transaction marked as completed

## 🚨 Error Handling

- **Failed STK Push**: User sees error message, can retry
- **Failed C2B**: Transaction marked as failed
- **Failed B2C Payout**: Queued for retry (3 attempts)
- **Network Issues**: Graceful degradation with user feedback

## 📈 Monitoring

### Queue Status
- Active jobs count
- Processing status
- Failed job retry attempts

### Transaction Analytics
- Total transactions
- Success/failure rates
- Average processing time
- Worker performance metrics

## 🔐 Security Features

- Rate limiting (5 STK requests per 15 minutes per IP)
- CSRF token validation on payment forms
- Idempotent callback processing
- Input validation and sanitization
- Secure environment variable handling

## 🚀 Deployment

### Render.com Deployment
1. Connect GitHub repository
2. Set environment variables in Render dashboard
3. Deploy with `npm start` command
4. Configure webhook URLs in Daraja portal

### Environment URLs
- **Callback URL**: `https://your-app.onrender.com/mpesa/c2b-callback`
- **Admin Dashboard**: `https://your-app.onrender.com/admin-dashboard.html`

## 🔄 Next Steps (Phase 2)

Phase 1 provides the foundation for:
- Mobile app integration
- Advanced admin features
- Worker analytics dashboard
- Customer review system
- Subscription management
- Multi-currency support

## 🐛 Troubleshooting

### Common Issues

1. **QR Generation Fails**
   - Check Supabase storage bucket exists
   - Verify storage policies allow public access

2. **STK Push Fails**
   - Validate M-Pesa credentials
   - Check phone number format (254XXXXXXXXX)
   - Verify callback URL is accessible

3. **B2C Payout Fails**
   - Check SECURITY_CREDENTIAL is correct
   - Verify B2C shortcode permissions
   - Ensure sufficient float balance

4. **Database Errors**
   - Run schema migration
   - Check RLS policies
   - Verify service key permissions

### Debug Mode
Set `NODE_ENV=development` for detailed logging.

## 📞 Support

For issues or questions:
1. Check the test suite output
2. Review server logs
3. Verify environment variables
4. Test M-Pesa credentials independently

---

**Phase 1 Status**: ✅ **READY FOR TESTING**

All core MVP features implemented and tested. Ready for sandbox testing and Phase 2 development.
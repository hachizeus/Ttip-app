# TTip - Digital Tipping Platform

A React Native app built with Expo that enables digital tipping through M-Pesa integration.

## Features

### Worker Features
- **Registration**: Workers sign up with name, gender, occupation, and M-Pesa number
- **Unique QR Codes**: Each worker gets a unique QR code for receiving tips
- **Subscription Plans**:
  - Free Trial (7 days): Unlimited tips
  - Lite Plan (KSh 50/month): Max single tip KSh 500
  - Pro Plan (KSh 150/month): Unlimited tips
- **Real-time Stats**: Track total tips and tip count

### Customer Features
- **QR Code Scanning**: Scan worker QR codes to initiate tips
- **Easy Tipping**: Simple interface to enter tip amount and phone number
- **M-Pesa Integration**: Secure payments through Daraja API

### System Features
- **Automatic Payouts**: Instant B2C transfers to workers after successful tips
- **SMS Notifications**: Workers receive congratulatory messages
- **Leaderboard**: Public ranking of top-earning workers
- **Subscription Management**: Automatic plan enforcement and renewals

## Tech Stack

- **Frontend**: Expo React Native
- **Backend**: Node.js/Express (M-Pesa integration)
- **Database**: Supabase (PostgreSQL)
- **Payments**: Safaricom Daraja API (STK Push + B2C)
- **QR Codes**: react-native-qrcode-svg

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Supabase
1. Create a Supabase project
2. Run the SQL schema from `supabase-schema.sql`
3. Update `lib/supabase.ts` with your Supabase URL and anon key

### 3. Configure M-Pesa (Daraja API)
1. Get Daraja API credentials from Safaricom
2. Create `.env` file in `mpesa-express-backend/`:
```env
BASE_URL=https://sandbox.safaricom.co.ke  # or production URL
CONSUMER_KEY=your_consumer_key
CONSUMER_SECRET=your_consumer_secret
SHORT_CODE=your_shortcode
PASSKEY=your_passkey
CALLBACK_URL=https://your-domain.com/api/callback
B2C_SHORTCODE=your_b2c_shortcode
SECURITY_CREDENTIAL=your_security_credential
INITIATOR_NAME=your_initiator_name
```

### 4. Start the Backend Server
```bash
cd mpesa-express-backend
npm install
node enhanced-server.js
```

### 5. Start the Expo App
```bash
npx expo start
```

## App Structure

```
app/
├── (tabs)/
│   └── index.tsx          # Home screen
├── signup.tsx             # Worker registration
├── worker/[id].tsx        # Worker profile with QR code
├── tip/[workerID].tsx     # Customer tipping interface
├── leaderboard.tsx        # Top earners ranking
└── scanner.tsx            # QR code scanner

lib/
├── supabase.ts            # Database client and types
└── mpesa.ts               # M-Pesa integration utilities

mpesa-express-backend/
├── enhanced-server.js     # Express server with callbacks
└── enhanced-daraja.mjs    # Daraja API integration
```

## Database Schema

### Workers Table
- Personal info (name, gender, occupation, phone)
- Worker ID and QR code data
- Subscription plan and expiry
- Tip statistics (total amount, count)

### Tips Table
- Tip transactions with status tracking
- Links to workers and customer phones
- M-Pesa transaction IDs

### Subscriptions Table
- Subscription payment tracking
- Plan details and expiry dates

## API Endpoints

### M-Pesa Backend
- `POST /api/pay` - Initiate STK push
- `POST /api/callback` - Handle STK push callbacks
- `POST /api/payout` - Initiate B2C payment
- `POST /api/b2c-callback` - Handle B2C callbacks

## Workflow

1. **Worker Registration**:
   - Worker signs up → Gets unique ID and QR code
   - 7-day free trial starts automatically

2. **Customer Tipping**:
   - Customer scans QR → Opens tip page
   - Enters amount and phone → STK push initiated
   - Customer confirms payment on phone

3. **Payment Processing**:
   - Daraja sends callback → Validates subscription limits
   - If valid → Initiates B2C payout to worker
   - Updates database and sends SMS notification

4. **Subscription Management**:
   - Workers can upgrade plans via M-Pesa
   - System enforces tip limits automatically
   - Expired subscriptions block new tips

## Security Features

- Row Level Security (RLS) in Supabase
- Input validation and sanitization
- Secure M-Pesa credential handling
- Transaction status verification

## Deployment

1. Deploy backend to cloud service (Railway, Heroku, etc.)
2. Update callback URLs in Daraja dashboard
3. Build and deploy mobile app via Expo
4. Configure production Supabase environment

## Testing

Use Safaricom's test credentials:
- Test phone: +254708374149
- Test amounts: 1-1000 KSh

## Support

For issues or questions, contact the development team.
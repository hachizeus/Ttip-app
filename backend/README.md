# TTip Backend API

M-Pesa Express integration backend for TTip application.

## Deployment on Render

1. Connect your GitHub repository to Render
2. Set the **Root Directory** to `backend`
3. Set **Build Command** to `npm install`
4. Set **Start Command** to `npm start`

## Environment Variables

Set these in Render dashboard:

```
BASE_URL=https://sandbox.safaricom.co.ke
CONSUMER_KEY=your_consumer_key
CONSUMER_SECRET=your_consumer_secret
SHORT_CODE=your_short_code
PASSKEY=your_passkey
CALLBACK_URL=https://your-render-app.onrender.com/api/callback
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_key
INFOBIP_API_KEY=your_infobip_api_key
INFOBIP_BASE_URL=your_infobip_base_url
API_KEY=your_api_key_for_protected_endpoints
PORT=3000
```

## API Endpoints

- `POST /api/pay` - Initiate M-Pesa STK Push
- `POST /api/callback` - M-Pesa callback handler
- `GET /tip/:workerID` - Web tip page
- `POST /api/web-tip` - Web tip payment
- `GET /health` - Health check

## Local Development

```bash
cd backend
npm install
npm start
```
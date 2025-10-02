@echo off
echo ========================================
echo TTip Phase 1 Setup Script
echo ========================================
echo.

cd backend

echo Installing Phase 1 dependencies...
npm install qrcode express-rate-limit

echo.
echo Copying Phase 1 files...
copy phase1-package.json package.json
copy phase1-server.js server.js

echo.
echo Setting up Supabase schema...
echo Please run the following SQL in your Supabase SQL editor:
echo.
type ..\phase1-schema.sql

echo.
echo ========================================
echo Phase 1 Setup Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Run the SQL schema in Supabase
echo 2. Update your .env file with all required variables
echo 3. Test with: npm run test
echo 4. Start server with: npm start
echo.
echo Required environment variables:
echo - SUPABASE_URL
echo - SUPABASE_SERVICE_KEY  
echo - CONSUMER_KEY
echo - CONSUMER_SECRET
echo - SHORT_CODE
echo - PASSKEY
echo - BACKEND_URL (optional, defaults to https://ttip-app.onrender.com)
echo.
pause
@echo off
echo ========================================
echo TTip Phase 1 Deployment
echo ========================================
echo.

cd backend

echo Backing up current server...
if exist server.js.backup del server.js.backup
if exist server.js ren server.js server.js.backup

echo Deploying Phase 1 server...
copy phase1-server.js server.js

echo Updating package.json...
copy phase1-package.json package.json

echo.
echo ========================================
echo Phase 1 Deployed Successfully!
echo ========================================
echo.
echo The Phase 1 server is now active.
echo.
echo Next steps:
echo 1. Ensure database schema is created (see PHASE1_SETUP_GUIDE.md)
echo 2. Create Supabase storage bucket for QR codes
echo 3. Test with: node run-test.js
echo 4. Start server with: npm start
echo.
echo Admin Dashboard: http://localhost:3000/admin-dashboard.html
echo Test Payment: http://localhost:3000/pay/WORKER001
echo.
pause
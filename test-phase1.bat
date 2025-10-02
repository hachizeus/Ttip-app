@echo off
echo ========================================
echo TTip Phase 1 - Complete System Test
echo ========================================
echo.

echo Starting backend server...
cd backend
start "TTip Backend" cmd /k "npm start"

echo Waiting for server to start...
timeout /t 5 /nobreak > nul

echo.
echo Running Phase 1 tests...
cd ..
node test-phase1-complete.js

echo.
echo ========================================
echo Test Complete!
echo ========================================
echo.
echo If all tests passed, you can now:
echo 1. Visit: http://localhost:3000/pay/WORKER001
echo 2. Admin: http://localhost:3000/admin
echo 3. QR Code: http://localhost:3000/qr/WORKER001
echo.
pause
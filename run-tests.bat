@echo off
echo Starting TTip Tests...
echo.

echo 1. Installing test dependencies...
npm install axios readline @supabase/supabase-js

echo.
echo 2. Starting backend server...
start "TTip Backend" cmd /k "cd mpesa-express-backend && npm start"

echo.
echo 3. Waiting for server to start...
timeout /t 5

echo.
echo 4. Testing Supabase connection...
node test-supabase.js

echo.
echo 5. Testing backend APIs...
echo Make sure your phone %254759001048% is ready to receive SMS
pause
node test-script.js

echo.
echo Tests completed!
pause
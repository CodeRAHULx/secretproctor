@echo off
REM Production Restructure Setup Script for Windows
REM Creates all necessary directories and installs dependencies

echo ================================================
echo   SecureMeet Production Restructure Setup
echo ================================================
echo.

REM Backend directories
echo [1/4] Creating backend directory structure...
if not exist "backend\models" mkdir backend\models
if not exist "backend\middleware" mkdir backend\middleware
if not exist "backend\validators" mkdir backend\validators
if not exist "backend\utils" mkdir backend\utils
if not exist "backend\tests\unit" mkdir backend\tests\unit
if not exist "backend\tests\integration" mkdir backend\tests\integration
if not exist "backend\logs" mkdir backend\logs

REM Frontend directories
echo [2/4] Creating frontend directory structure...
if not exist "frontend\src\components\common\Button" mkdir frontend\src\components\common\Button
if not exist "frontend\src\components\common\Card" mkdir frontend\src\components\common\Card
if not exist "frontend\src\components\common\Modal" mkdir frontend\src\components\common\Modal
if not exist "frontend\src\components\common\Input" mkdir frontend\src\components\common\Input
if not exist "frontend\src\components\common\Avatar" mkdir frontend\src\components\common\Avatar
if not exist "frontend\src\components\layout" mkdir frontend\src\components\layout
if not exist "frontend\src\components\meeting\VideoGrid" mkdir frontend\src\components\meeting\VideoGrid
if not exist "frontend\src\components\meeting\Chat" mkdir frontend\src\components\meeting\Chat
if not exist "frontend\src\components\meeting\Participants" mkdir frontend\src\components\meeting\Participants
if not exist "frontend\src\components\host" mkdir frontend\src\components\host
if not exist "frontend\src\store" mkdir frontend\src\store
if not exist "frontend\src\hooks" mkdir frontend\src\hooks
if not exist "frontend\src\layouts" mkdir frontend\src\layouts
if not exist "frontend\src\pages" mkdir frontend\src\pages
if not exist "frontend\src\services\webrtc" mkdir frontend\src\services\webrtc
if not exist "frontend\src\services\sse" mkdir frontend\src\services\sse
if not exist "frontend\src\utils" mkdir frontend\src\utils

REM C++ directories
echo [3/4] Creating C++ directory structure...
if not exist "native\include\core" mkdir native\include\core
if not exist "native\include\detectors" mkdir native\include\detectors
if not exist "native\include\utils" mkdir native\include\utils
if not exist "native\include\platform" mkdir native\include\platform
if not exist "native\src\core" mkdir native\src\core
if not exist "native\src\detectors" mkdir native\src\detectors
if not exist "native\src\utils" mkdir native\src\utils
if not exist "native\src\platform" mkdir native\src\platform
if not exist "native\tests" mkdir native\tests
if not exist "native\build" mkdir native\build

REM Python AI service directories
echo [4/4] Creating Python AI service structure...
if not exist "ai-service\src\api\routes" mkdir ai-service\src\api\routes
if not exist "ai-service\src\api\middleware" mkdir ai-service\src\api\middleware
if not exist "ai-service\src\services" mkdir ai-service\src\services
if not exist "ai-service\src\models" mkdir ai-service\src\models
if not exist "ai-service\src\utils" mkdir ai-service\src\utils
if not exist "ai-service\tests" mkdir ai-service\tests

echo.
echo ✅ Directory structure created successfully!
echo.

REM Install backend dependencies
echo [Backend] Installing additional dependencies...
cd backend
call npm install --save winston joi express-rate-limit helmet compression morgan
cd ..

REM Install frontend dependencies
echo [Frontend] Installing additional dependencies...
cd frontend
call npm install --save zustand
cd ..

echo.
echo ================================================
echo   ✅ Setup Complete!
echo ================================================
echo.
echo Next steps:
echo   1. Review the production plan: .claude\plans\cryptic-swimming-yeti.md
echo   2. Start implementing backend models
echo   3. Split frontend hooks
echo   4. Refactor C++ detector
echo.
pause

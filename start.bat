@echo off
title WORLDVIEW - Starting...
echo.
echo  ============================================
echo   WORLDVIEW - Geospatial Intelligence Platform
echo  ============================================
echo.

:: Check if node is available
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js not found. Please install Node.js first.
    pause
    exit /b 1
)

:: Install dependencies if needed
if not exist "backend\node_modules" (
    echo [SETUP] Installing backend dependencies...
    cd backend && npm install && cd ..
)
if not exist "frontend\node_modules" (
    echo [SETUP] Installing frontend dependencies...
    cd frontend && npm install && cd ..
)

echo [1/2] Starting backend server (ports 8080/8081)...
start /b "WORLDVIEW-Backend" cmd /c "cd backend && npx tsx watch server.ts"

:: Give backend a moment to start
timeout /t 2 /nobreak >nul

echo [2/2] Starting frontend dev server (port 3000)...
start /b "WORLDVIEW-Frontend" cmd /c "cd frontend && npx next dev --port 3000"

timeout /t 3 /nobreak >nul

echo.
echo  ============================================
echo   WORLDVIEW is running!
echo   Frontend:  http://localhost:3000
echo   Backend:   http://localhost:8080
echo   WebSocket: ws://localhost:8081
echo  ============================================
echo.
echo  Press any key to stop all servers...
pause >nul

:: Cleanup
echo.
echo [STOP] Shutting down servers...
taskkill /fi "WINDOWTITLE eq WORLDVIEW-Backend" /f >nul 2>nul
taskkill /fi "WINDOWTITLE eq WORLDVIEW-Frontend" /f >nul 2>nul
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000 " ^| findstr "LISTENING"') do taskkill /pid %%a /f >nul 2>nul
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8080 " ^| findstr "LISTENING"') do taskkill /pid %%a /f >nul 2>nul
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8081 " ^| findstr "LISTENING"') do taskkill /pid %%a /f >nul 2>nul
echo [DONE] All servers stopped.

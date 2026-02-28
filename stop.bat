@echo off
echo.
echo  Stopping WORLDVIEW servers...
echo.

:: Kill by window title
taskkill /fi "WINDOWTITLE eq WORLDVIEW-Backend" /f >nul 2>nul
taskkill /fi "WINDOWTITLE eq WORLDVIEW-Frontend" /f >nul 2>nul

:: Kill by port
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000 " ^| findstr "LISTENING"') do (
    echo  Killing process on port 3000 (PID %%a)
    taskkill /pid %%a /f >nul 2>nul
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8080 " ^| findstr "LISTENING"') do (
    echo  Killing process on port 8080 (PID %%a)
    taskkill /pid %%a /f >nul 2>nul
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8081 " ^| findstr "LISTENING"') do (
    echo  Killing process on port 8081 (PID %%a)
    taskkill /pid %%a /f >nul 2>nul
)

echo.
echo  All WORLDVIEW servers stopped.
echo.

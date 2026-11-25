@echo off
setlocal
chcp 65001 >nul

cd /d "%~dp0.."

echo ====================================================
echo   Taqniya Cloud POS - Docker Launcher (Offline Ready)
echo ====================================================
echo.

where docker >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Docker is not installed or not in PATH!
    echo Please install Docker Desktop and start it first.
    echo.
    pause
    exit /b 1
)

:: 1. Start Local Printer Bridge in background (if not already running)
echo [1/4] Checking Local Printer Bridge (Port 9124)...
netstat -ano | findstr :9124 >nul 2>nul
if errorlevel 1 (
    echo   - Starting Printer Bridge service...
    if exist "printer_bridge\start_silent.vbs" (
        wscript "printer_bridge\start_silent.vbs"
    )
    timeout /t 2 /nobreak >nul
) else (
    echo   - Printer Bridge is already active.
)

:: 2. Load Offline bundle if present
if exist "perfumes_bundle_offline.tar" (
    echo [2/4] Loading offline Docker images...
    docker load -i perfumes_bundle_offline.tar
)

:: 3. Start containers
echo [3/4] Starting containers...
docker compose up -d

if errorlevel 1 (
    echo [ERROR] Failed to start Docker Compose!
    echo Please make sure Docker Desktop is running.
    echo.
    pause
    exit /b 1
)

echo [4/4] Taqniya POS is ready!
echo URL: http://localhost:8000
echo.
pause

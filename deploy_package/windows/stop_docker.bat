@echo off
setlocal
chcp 65001 >nul

cd /d "%~dp0.."

echo ====================================================
echo   Stopping Taqniya Cloud POS (Docker & Services)
echo ====================================================
echo.

echo [1/2] Stopping Docker containers...
docker compose stop

echo [2/2] Stopping Local Printer Bridge (if running)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :9124') do (
    taskkill /F /PID %%a >nul 2>nul
)

echo.
echo Application & Printer Bridge stopped successfully.
echo Your data is safe in MySQL volume.
echo.
pause

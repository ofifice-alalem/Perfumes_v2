@echo off
setlocal
chcp 65001 >nul

echo ============================================================
echo   Build and Export Perfumes Docker Image (Offline Bundle)
echo ============================================================
echo.

cd /d "%~dp0"

where docker >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Docker is not installed or not running!
    echo Please make sure Docker Desktop is started.
    echo.
    pause
    exit /b 1
)

echo [1/3] Pulling MySQL 8.0 base image...
docker pull mysql:8.0

echo.
echo [2/3] Building application image (perfumes_v2_app:latest)...
docker build -f deploy_package/Dockerfile -t perfumes_v2_app:latest .

if errorlevel 1 (
    echo.
    echo [ERROR] Docker build failed! Please check errors above.
    pause
    exit /b 1
)

echo.
echo [3/3] Exporting images to deploy_package\perfumes_bundle_offline.tar...
docker save -o deploy_package\perfumes_bundle_offline.tar perfumes_v2_app:latest mysql:8.0

if errorlevel 1 (
    echo [ERROR] Failed to save Docker bundle tar file.
    pause
    exit /b 1
)

echo.
echo ============================================================
echo   [SUCCESS] Docker bundle built and saved successfully!
echo   Location: deploy_package\perfumes_bundle_offline.tar
echo ============================================================
echo.
pause

@echo off
echo ===================================================
echo   Perfumes V2 - Server Setup & Optimization Helper
echo ===================================================
echo.

echo 1. Checking Apache Configuration Syntax...
"C:\Apache24\bin\httpd.exe" -t
if errorlevel 1 (
    echo [ERROR] Apache configuration syntax check failed! Please check httpd.conf or httpd-vhosts.conf.
    pause
    exit /b 1
)

echo.
echo 2. Optimization and Caching Laravel Production Assets...
cd /d "C:\Users\alale\OneDrive\Desktop\work\Perfumes_v2"
call php artisan config:cache
call php artisan route:cache
call php artisan view:cache

echo.
echo 3. Restarting Apache2.4 Service...
net stop Apache2.4
net start Apache2.4

echo.
echo ===================================================
echo   Server Setup & Restart Completed Successfully!
echo ===================================================
pause

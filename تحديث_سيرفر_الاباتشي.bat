@echo off
:: تشغيل كمسؤول لإعادة تشغيل خدمة Apache
echo ======================================================
echo   Taqniya Cloud - Apache & SSL Auto Restart Helper
echo ======================================================
echo.
echo 1. Stopping Apache2.4 service...
net stop Apache2.4
echo.
echo 2. Starting Apache2.4 service with new SSL & alalem.com config...
net start Apache2.4
echo.
echo 3. Clearing Laravel optimization cache...
cd /d "C:\Users\alale\OneDrive\Desktop\work\Perfumes_v2"
call php artisan optimize:clear
echo.
echo ======================================================
echo   SUCCESS! alalem.com is now fully active with HTTPS!
echo ======================================================
pause


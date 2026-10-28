@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"
cls
php delete_top_products.php
echo.
pause

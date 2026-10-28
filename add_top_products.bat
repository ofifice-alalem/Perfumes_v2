@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"
cls
php add_top_products.php
echo.
pause

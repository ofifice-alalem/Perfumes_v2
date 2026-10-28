@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"
cls
php update_top_names.php
echo.
pause

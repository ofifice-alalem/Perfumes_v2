@echo off
setlocal
chcp 65001 >nul

echo ====================================================
echo   Enable Silent Auto-Start on Windows Boot
echo ====================================================
echo.

set "SOURCE_VBS=%~dp0run_silent.vbs"
set "STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "SHORTCUT_VBS=%TEMP%\CreateShortcut_%RANDOM%.vbs"
set "SHORTCUT_PATH=%STARTUP_FOLDER%\Taqniya_Cloud_POS.lnk"

if not exist "%SOURCE_VBS%" (
    echo [ERROR] run_silent.vbs not found!
    rem pause
    exit /b 1
)

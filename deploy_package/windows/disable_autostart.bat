@echo off
setlocal
chcp 65001 >nul

echo ====================================================
echo   Disable Auto-Start on Windows Boot
echo ====================================================
echo.

set "STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "SHORTCUT_PATH=%STARTUP_FOLDER%\Taqniya_Cloud_POS.lnk"

if exist "%SHORTCUT_PATH%" (
    del "%SHORTCUT_PATH%"
    echo [SUCCESS] Auto-start disabled successfully.
) else (
    echo [INFO] Auto-start is not enabled.
)

echo.
pause

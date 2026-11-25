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
    pause
    exit /b 1
)

echo Creating Windows Silent Startup Shortcut...
(
    echo Set oWS = WScript.CreateObject^("WScript.Shell"^)
    echo sLinkFile = "%SHORTCUT_PATH%"
    echo Set oLink = oWS.CreateShortcut^(sLinkFile^)
    echo oLink.TargetPath = "wscript.exe"
    echo oLink.Arguments = """" ^& "%SOURCE_VBS%" ^& """"
    echo oLink.WorkingDirectory = "%~dp0"
    echo oLink.Description = "Taqniya Cloud POS Silent Launcher"
    echo oLink.WindowStyle = 7
    echo oLink.Save
) > "%SHORTCUT_VBS%"

cscript //nologo "%SHORTCUT_VBS%"
del "%SHORTCUT_VBS%" >nul 2>&1

if exist "%SHORTCUT_PATH%" (
    echo.
    echo ====================================================
    echo   [SUCCESS] Silent Auto-Start enabled successfully!
    echo ====================================================
    echo Now whenever Windows boots up:
    echo - NO Terminal / CMD window will appear (100%% Silent).
    echo - Everything (Docker + Printer Bridge) starts invisibly in the background.
    echo.
) else (
    echo [ERROR] Failed to create startup shortcut.
)

pause

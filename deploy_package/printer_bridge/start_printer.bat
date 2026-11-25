@echo off
setlocal
chcp 65001 >nul

cd /d "%~dp0"

echo ====================================================
echo   Taqniya Cloud POS - Local USB Printer Bridge
echo ====================================================
echo.

set "NODE_EXE=node.exe"
if not exist "%NODE_EXE%" (
    where node >nul 2>nul
    if %errorlevel% equ 0 (
        set "NODE_EXE=node"
    ) else (
        echo [ERROR] node.exe not found!
        pause
        exit /b 1
    )
)

echo Starting Printer Bridge on port 9124...
"%NODE_EXE%" server.js

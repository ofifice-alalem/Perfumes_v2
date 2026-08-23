@echo off
chcp 65001 >nul
:: طلب صلاحيات المسؤول تلقائياً
net session >nul 2>&1
if %errorLevel% neq 0 (
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

echo ===================================================
echo جاري تعطيل خدمات IIS وتحرير المنفذ 80 و 443 لأباتشي...
echo ===================================================

net stop W3SVC /y >nul 2>&1
net stop WAS /y >nul 2>&1
sc config W3SVC start= disabled >nul 2>&1
sc config WAS start= disabled >nul 2>&1

:: إزالة تأخير IPv6 من ملف hosts لربط tajori.store مباشرة بـ 127.0.0.1 فائق السرعة
powershell -Command "$c = (Get-Content C:\Windows\System32\drivers\etc\hosts) -notmatch '::1.*tajori'; $c | Set-Content C:\Windows\System32\drivers\etc\hosts"

echo.
echo ===================================================
echo تم تحرير المنفذ 80 و 443 بنجاح تام!
echo يمكنك الآن تشغيل المنظومة مباشرة على المنفذ 80.
echo ===================================================
timeout /t 3

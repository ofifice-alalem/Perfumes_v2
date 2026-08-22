Set WshShell = CreateObject("WScript.Shell")

' 1. إنهاء أي عملية أباتشي معلقة وإعادة تشغيلها في الخلفية بصمت تام
WshShell.Run "cmd /c ""taskkill /F /IM httpd.exe > NUL 2>&1 & timeout /t 1 /nobreak > NUL & start /B """" ""C:\Apache24\bin\httpd.exe""""""", 0, True

' 2. الفحص الذكي حتى التأكد من رجوع كود 200 OK من الموقع
Dim ready, i
ready = False

For i = 1 To 30
    Dim exitCode
    exitCode = WshShell.Run("cmd /c ""curl.exe -s -k -L -I -H ""Host: tajori.store"" https://127.0.0.1:8443 | findstr /i /c:""200 OK"" > NUL""", 0, True)
    If exitCode = 0 Then
        ready = True
        Exit For
    End If
    WScript.Sleep 500
Next

' 3. فتح المتصفح بملء الشاشة وحفظ البيانات
WshShell.Run """C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"" --kiosk-printing --app=https://tajori.store:8443 --start-fullscreen --user-data-dir=""C:\EdgeAppData""", 1, False

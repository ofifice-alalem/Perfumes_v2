Set WshShell = CreateObject("WScript.Shell")

' 1. التأكد من تشغيل أباتشي في الخلفية بصمت إذا لم يكن يعمل
WshShell.Run "cmd /c ""tasklist /FI \""IMAGENAME eq httpd.exe\"" | findstr /i httpd.exe > NUL || start /B """" ""C:\Apache24\bin\httpd.exe""""""", 0, False

' 2. فحص حالة جاهزية السيرفر حتى يرجع كود 200 OK بنجاح
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

' 3. إطلاق المتصفح بوضع التطبيق بعد تأكد استجابة السيرفر الكاملة
WshShell.Run """C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"" --kiosk-printing --app=https://tajori.store:8443 --start-fullscreen --user-data-dir=""C:\EdgeAppData""", 1, False

Set WshShell = CreateObject("WScript.Shell")

' 1. تشغيل أباتشي مباشرة في الخلفية بصمت تام
WshShell.CurrentDirectory = "C:\Apache24"
WshShell.Run "C:\Apache24\bin\httpd.exe", 0, False

' 2. فحص جاهزية السيرفر حتى يرجع كود 200 OK
Dim ready, i
ready = False

For i = 1 To 40
    Dim exitCode
    exitCode = WshShell.Run("cmd /c ""curl.exe -s -k -L -I -H ""Host: tajori.store"" https://127.0.0.1/login | findstr /i /c:""200 OK"" > NUL""", 0, True)
    If exitCode = 0 Then
        ready = True
        Exit For
    End If
    WScript.Sleep 500
Next

' 3. إطلاق المتصفح بوضع التطبيق والطباعة الصامتة على المنفذ 80 المباشر
WshShell.Run """C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"" --kiosk-printing --app=http://tajori.store --start-fullscreen --user-data-dir=""C:\EdgeAppData""", 1, False

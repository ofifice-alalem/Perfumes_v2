Set WshShell = CreateObject("WScript.Shell")
Dim ready, i
ready = False

' يفحص حالة جاهزية السيرفر حتى يرجع كود 200 OK بنجاح (كل 500 ملي ثانية)
For i = 1 To 30
    Dim exitCode
    exitCode = WshShell.Run("cmd /c ""curl.exe -s -k -L -I -H ""Host: tajori.store"" https://127.0.0.1 | findstr /i /c:""200 OK"" > NUL""", 0, True)
    If exitCode = 0 Then
        ready = True
        Exit For
    End If
    WScript.Sleep 500
Next

' يطلق المتصفح فور تأكد كود 200 OK واستجابة الموقع الكاملة
WshShell.Run """C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"" --app=https://tajori.store --start-fullscreen --user-data-dir=""C:\EdgeAppData""", 1, False

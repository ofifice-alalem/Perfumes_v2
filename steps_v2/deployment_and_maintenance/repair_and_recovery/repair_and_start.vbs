Set WshShell = CreateObject("WScript.Shell")

' 1. إعادة تشغيل خدمة Apache في الخلفية بصمت تام ودون أي نافذة سوداء
WshShell.Run "cmd /c ""net stop Apache2.4 & net start Apache2.4""", 0, True

' 2. الفحص الذكي حتى التأكد من رجوع كود 200 OK من الموقع
Dim ready, i
ready = False

For i = 1 To 30
    Dim exitCode
    exitCode = WshShell.Run("cmd /c ""curl.exe -s -k -L -I -H ""Host: tajori.store"" https://127.0.0.1 | findstr /i /c:""200 OK"" > NUL""", 0, True)
    If exitCode = 0 Then
        ready = True
        Exit For
    End If
    WScript.Sleep 500
Next

' 3. فتح المتصفح بملء الشاشة وحفظ البيانات
WshShell.Run """C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"" --app=https://tajori.store --start-fullscreen --user-data-dir=""C:\EdgeAppData""", 1, False

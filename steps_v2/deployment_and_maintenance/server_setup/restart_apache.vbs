Set WshShell = CreateObject("WScript.Shell")

' 1. فحص صحة أكواد وسينتاكس Apache بصمت
Dim checkResult
checkResult = WshShell.Run("cmd /c ""C:\Apache24\bin\httpd.exe -t > NUL 2>&1""", 0, True)

If checkResult = 0 Then
    ' 2. إعادة تشغيل خدمة Apache بصمت
    WshShell.Run "cmd /c ""net stop Apache2.4 & net start Apache2.4""", 0, True
    
    ' 3. مسح وتحديث التخزين المؤقت لـ Laravel بصمت
    WshShell.Run "cmd /c ""cd /d C:\Users\alale\OneDrive\Desktop\work\Perfumes_v2 & php artisan optimize:clear & php artisan optimize""", 0, True
Else
    MsgBox "خطأ في أكواد إعدادات Apache! الرجاء التأكد من ملف httpd.conf", 16, "خطأ في السيرفر"
End If

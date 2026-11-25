Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' الحصول على مجلد الحزمة الرئيسي (المجلد الأب لـ windows)
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
baseDir = fso.GetParentFolderName(scriptDir)
WshShell.CurrentDirectory = baseDir

' 1. تشغيل وسيط الطابعة في الخلفية بصمت تام (0 تعني نافذة مخفية)
if fso.FileExists(baseDir & "\printer_bridge\start_silent.vbs") then
    WshShell.Run "wscript //nologo """ & baseDir & "\printer_bridge\start_silent.vbs""", 0, False
end if

' 2. انتظار جاهزية Docker Daemon في الخلفية بهدوء
dockerReady = False
For i = 1 to 30
    ret = WshShell.Run("cmd /c docker info >nul 2>&1", 0, True)
    if ret = 0 then
        dockerReady = True
        Exit For
    end if
    WScript.Sleep 2000
Next

' 3. تشغيل حاويات Docker في الخلفية بصمت تام (نافذة مخفية 100%)
WshShell.Run "cmd /c docker compose up -d >nul 2>&1", 0, True

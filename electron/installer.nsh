!include "LogicLib.nsh"

!macro customInstall
  SetOutPath "$INSTDIR"
  CreateShortCut "$DESKTOP\منظومة السحابة.lnk" "$INSTDIR\منظومة السحابة.exe" "--mode=pos"
  CreateShortCut "$DESKTOP\إعدادات خادم السحابة.lnk" "$INSTDIR\منظومة السحابة.exe" "--mode=settings"
  CreateDirectory "$SMPROGRAMS\منظومة السحابة"
  CreateShortCut "$SMPROGRAMS\منظومة السحابة\منظومة السحابة.lnk" "$INSTDIR\منظومة السحابة.exe" "--mode=pos"
  CreateShortCut "$SMPROGRAMS\منظومة السحابة\إعدادات خادم السحابة.lnk" "$INSTDIR\منظومة السحابة.exe" "--mode=settings"

  ; 🟢 الكشف التلقائي عن حزمة السيرفر بجانب المثبت في الفلاشة أو المجلد
  ; 1. في حال وجود مجلد server_payload
  ${If} ${FileExists} "$EXEDIR\server_payload\server\*.*"
    CreateDirectory "$INSTDIR\resources\server"
    CopyFiles /SILENT "$EXEDIR\server_payload\server\*.*" "$INSTDIR\resources\server"
  ${EndIf}
  ${If} ${FileExists} "$EXEDIR\server_payload\php\*.*"
    CreateDirectory "$INSTDIR\resources\php"
    CopyFiles /SILENT "$EXEDIR\server_payload\php\*.*" "$INSTDIR\resources\php"
  ${EndIf}

  ; 2. في حال وجود مجلدات منفصلة server أو php مباشرة بجانب الـ Setup
  ${If} ${FileExists} "$EXEDIR\server\*.*"
    CreateDirectory "$INSTDIR\resources\server"
    CopyFiles /SILENT "$EXEDIR\server\*.*" "$INSTDIR\resources\server"
  ${EndIf}
  ${If} ${FileExists} "$EXEDIR\php\*.*"
    CreateDirectory "$INSTDIR\resources\php"
    CopyFiles /SILENT "$EXEDIR\php\*.*" "$INSTDIR\resources\php"
  ${EndIf}

  ; 3. في حال وجود ملف مضغوط server_payload.zip
  ${If} ${FileExists} "$EXEDIR\server_payload.zip"
    CopyFiles /SILENT "$EXEDIR\server_payload.zip" "$INSTDIR\resources\server_payload.zip"
  ${EndIf}
!macroend

!macro customUnInstall
  Delete "$DESKTOP\منظومة السحابة.lnk"
  Delete "$DESKTOP\إعدادات خادم السحابة.lnk"
  RMDir /r "$SMPROGRAMS\منظومة السحابة"
!macroend

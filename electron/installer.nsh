!include "LogicLib.nsh"

!macro customInstall
  SetOutPath "$INSTDIR"

  ; 1. تنظيف أي اختصارات مبيعات سابقة قد تكون موجودة قبل إتمام التهيئة
  Delete "$DESKTOP\منظومة السحابة.lnk"
  Delete "$DESKTOP\منظومة المبيعات.lnk"
  Delete "$SMPROGRAMS\منظومة السحابة\منظومة السحابة.lnk"
  Delete "$SMPROGRAMS\منظومة السحابة\منظومة المبيعات.lnk"

  ; 2. في البداية: إنشاء اختصار أداة الإعدادات فقط (المبيعات تُنشأ ديناميكياً وحصرياً بعد اكتمال الإعدادات)
  CreateShortCut "$DESKTOP\إعدادات خادم السحابة.lnk" "$INSTDIR\منظومة السحابة.exe" "--mode=settings"
  CreateDirectory "$SMPROGRAMS\منظومة السحابة"
  CreateShortCut "$SMPROGRAMS\منظومة السحابة\إعدادات خادم السحابة.lnk" "$INSTDIR\منظومة السحابة.exe" "--mode=settings"

  ; 3. حفظ مسار التثبيت الفعلي في السجل للوصول إليه عند توليد اختصار المبيعات لاحقاً
  WriteRegStr HKCU "Software\TaqniyaCloud" "InstallPath" "$INSTDIR"
  WriteRegStr HKLM "Software\TaqniyaCloud" "InstallPath" "$INSTDIR"

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

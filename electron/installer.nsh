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

  ; 🟢 4. الكشف التلقائي عن حزمة السيرفر وتثبيت Apache و PHP على ويندوز تلقائياً
  ; أ. نسخ ملفات خادم Laravel الأساسية
  ${If} ${FileExists} "$EXEDIR\server_payload\server\*.*"
    CreateDirectory "$INSTDIR\resources\server"
    CopyFiles /SILENT "$EXEDIR\server_payload\server\*.*" "$INSTDIR\resources\server"
  ${EndIf}
  ${If} ${FileExists} "$EXEDIR\server\*.*"
    CreateDirectory "$INSTDIR\resources\server"
    CopyFiles /SILENT "$EXEDIR\server\*.*" "$INSTDIR\resources\server"
  ${EndIf}

  ; ب. تثبيت مفسر PHP في C:\php-8.4.24 تلقائياً إن لم يكن موجوداً
  ${If} ${FileExists} "$EXEDIR\server_payload\php\*.*"
    CreateDirectory "$INSTDIR\resources\php"
    CopyFiles /SILENT "$EXEDIR\server_payload\php\*.*" "$INSTDIR\resources\php"
    ${IfNot} ${FileExists} "C:\php-8.4.24\php.exe"
      CreateDirectory "C:\php-8.4.24"
      CopyFiles /SILENT "$EXEDIR\server_payload\php\*.*" "C:\php-8.4.24"
    ${EndIf}
  ${EndIf}
  ${If} ${FileExists} "$EXEDIR\php\*.*"
    CreateDirectory "$INSTDIR\resources\php"
    CopyFiles /SILENT "$EXEDIR\php\*.*" "$INSTDIR\resources\php"
    ${IfNot} ${FileExists} "C:\php-8.4.24\php.exe"
      CreateDirectory "C:\php-8.4.24"
      CopyFiles /SILENT "$EXEDIR\php\*.*" "C:\php-8.4.24"
    ${EndIf}
  ${EndIf}

  ; ج. تثبيت خادم Apache 2.4 في C:\Apache24 وتسجيله كخدمة ويندوز تلقائية
  ${If} ${FileExists} "$EXEDIR\server_payload\apache\*.*"
    CreateDirectory "$INSTDIR\resources\apache"
    CopyFiles /SILENT "$EXEDIR\server_payload\apache\*.*" "$INSTDIR\resources\apache"
    ${IfNot} ${FileExists} "C:\Apache24\bin\httpd.exe"
      CreateDirectory "C:\Apache24"
      CopyFiles /SILENT "$EXEDIR\server_payload\apache\*.*" "C:\Apache24"
      
      ; تثبيت وتشغيل خدمة Apache2.4 في ويندوز
      ExecWait '"C:\Apache24\bin\httpd.exe" -k install -n Apache2.4'
      ExecWait 'sc.exe config Apache2.4 start= auto'
      ExecWait 'net start Apache2.4'
      
      ; تثبيت شهادة Root CA المحلية عبر mkcert
      ${If} ${FileExists} "C:\Apache24\bin\mkcert.exe"
        ExecWait '"C:\Apache24\bin\mkcert.exe" -install'
      ${EndIf}
    ${EndIf}
  ${EndIf}
  ${If} ${FileExists} "$EXEDIR\apache\*.*"
    CreateDirectory "$INSTDIR\resources\apache"
    CopyFiles /SILENT "$EXEDIR\apache\*.*" "$INSTDIR\resources\apache"
    ${IfNot} ${FileExists} "C:\Apache24\bin\httpd.exe"
      CreateDirectory "C:\Apache24"
      CopyFiles /SILENT "$EXEDIR\apache\*.*" "C:\Apache24"
      
      ExecWait '"C:\Apache24\bin\httpd.exe" -k install -n Apache2.4'
      ExecWait 'sc.exe config Apache2.4 start= auto'
      ExecWait 'net start Apache2.4'
      
      ${If} ${FileExists} "C:\Apache24\bin\mkcert.exe"
        ExecWait '"C:\Apache24\bin\mkcert.exe" -install'
      ${EndIf}
    ${EndIf}
  ${EndIf}

  ; د. في حال وجود ملف مضغوط server_payload.zip
  ${If} ${FileExists} "$EXEDIR\server_payload.zip"
    CopyFiles /SILENT "$EXEDIR\server_payload.zip" "$INSTDIR\resources\server_payload.zip"
  ${EndIf}
!macroend

!macro customUnInstall
  Delete "$DESKTOP\منظومة السحابة.lnk"
  Delete "$DESKTOP\إعدادات خادم السحابة.lnk"
  RMDir /r "$SMPROGRAMS\منظومة السحابة"
!macroend

!macro customInstall
  CreateShortCut "$DESKTOP\إعدادات خادم السحابة.lnk" "$INSTDIR\منظومة السحابة.exe" "--mode=settings"
!macroend

!macro customUnInstall
  Delete "$DESKTOP\إعدادات خادم السحابة.lnk"
!macroend


!macro customInstall
  CreateShortCut "$DESKTOP\منظومة السحابة.lnk" "$INSTDIR\منظومة السحابة.exe" "--mode=pos"
  CreateShortCut "$DESKTOP\إعدادات خادم السحابة.lnk" "$INSTDIR\منظومة السحابة.exe" "--mode=settings"
!macroend

!macro customUnInstall
  Delete "$DESKTOP\منظومة السحابة.lnk"
  Delete "$DESKTOP\إعدادات خادم السحابة.lnk"
!macroend

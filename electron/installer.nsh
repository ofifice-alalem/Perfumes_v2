!macro customInstall
  SetOutPath "$INSTDIR"
  CreateShortCut "$DESKTOP\منظومة السحابة.lnk" "$INSTDIR\منظومة السحابة.exe" "--mode=pos"
  CreateShortCut "$DESKTOP\إعدادات خادم السحابة.lnk" "$INSTDIR\منظومة السحابة.exe" "--mode=settings"
  CreateDirectory "$SMPROGRAMS\منظومة السحابة"
  CreateShortCut "$SMPROGRAMS\منظومة السحابة\منظومة السحابة.lnk" "$INSTDIR\منظومة السحابة.exe" "--mode=pos"
  CreateShortCut "$SMPROGRAMS\منظومة السحابة\إعدادات خادم السحابة.lnk" "$INSTDIR\منظومة السحابة.exe" "--mode=settings"
!macroend

!macro customUnInstall
  Delete "$DESKTOP\منظومة السحابة.lnk"
  Delete "$DESKTOP\إعدادات خادم السحابة.lnk"
  RMDir /r "$SMPROGRAMS\منظومة السحابة"
!macroend

Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
currentDir = fso.GetParentFolderName(WScript.ScriptFullName)
batPath = """" & currentDir & "\start_printer.bat"""
WshShell.CurrentDirectory = currentDir
WshShell.Run batPath, 0, False

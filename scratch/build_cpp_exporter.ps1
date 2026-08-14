$gcc = "C:\Users\alale\AppData\Local\Microsoft\WinGet\Packages\BrechtSanders.WinLibs.POSIX.UCRT_Microsoft.Winget.Source_8wekyb3d8bbwe\mingw64\bin\gcc.exe"
$gpp = "C:\Users\alale\AppData\Local\Microsoft\WinGet\Packages\BrechtSanders.WinLibs.POSIX.UCRT_Microsoft.Winget.Source_8wekyb3d8bbwe\mingw64\bin\g++.exe"

Write-Host "=== BUILDING 100% SELF-CONTAINED STATIC C++ EXPORTER ENGINE ==="

$includeDir = "bin/libxlsxwriter/include"
$minizipInc = "bin/libxlsxwriter/third_party"
$zlibInc    = "bin/zlib"

$cFiles = Get-ChildItem "bin/libxlsxwriter/src/*.c"
$minizipFiles = Get-ChildItem "bin/libxlsxwriter/third_party/minizip/ioapi.c", "bin/libxlsxwriter/third_party/minizip/zip.c"
$tmpfileFiles = Get-ChildItem "bin/libxlsxwriter/third_party/tmpfileplus/tmpfileplus.c"
$md5Files = Get-ChildItem "bin/libxlsxwriter/third_party/md5/md5.c"
$zlibFiles = Get-ChildItem "bin/zlib/adler32.c", "bin/zlib/compress.c", "bin/zlib/crc32.c", "bin/zlib/deflate.c", "bin/zlib/gzclose.c", "bin/zlib/gzlib.c", "bin/zlib/gzread.c", "bin/zlib/gzwrite.c", "bin/zlib/infback.c", "bin/zlib/inffast.c", "bin/zlib/inflate.c", "bin/zlib/inftrees.c", "bin/zlib/trees.c", "bin/zlib/uncompr.c", "bin/zlib/zutil.c"

$objDir = "bin/libxlsxwriter/obj"
if (-not (Test-Path $objDir)) { New-Item -ItemType Directory -Force -Path $objDir | Out-Null }

$allCFiles = @($cFiles.FullName) + @($minizipFiles.FullName) + @($tmpfileFiles.FullName) + @($md5Files.FullName) + @($zlibFiles.FullName)

Write-Host "Compiling C sources (libxlsxwriter + zlib)..."
foreach ($cFile in $allCFiles) {
    $objFile = "$objDir\" + [System.IO.Path]::GetFileNameWithoutExtension($cFile) + ".o"
    & $gcc -O3 -DHAVE_LIBXLSXWRITER -I $includeDir -I $minizipInc -I $zlibInc -c $cFile -o $objFile
}

Write-Host "Compiling C++ Main Exporter Engine statically..."
$objs = Get-ChildItem "$objDir/*.o" | Select-Object -ExpandProperty FullName
& $gpp -O3 -static -static-libgcc -static-libstdc++ -DHAVE_LIBXLSXWRITER -I $includeDir -I $zlibInc bin/export_xlsx.cpp $objs -o bin/export_xlsx.exe

Write-Host "Static Build finished!"

@echo off
rem Removes the shortcuts and the Chrome policy made by setup-kasir.bat.
rem The cashier profile (with any offline notes not yet synced) is kept on purpose.
setlocal

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "foreach ($folder in 'Desktop','Startup') {" ^
  "  Remove-Item -ErrorAction SilentlyContinue (Join-Path ([Environment]::GetFolderPath($folder)) 'Laku POS Kasir.lnk') }"
reg delete "HKCU\Software\Policies\Google\Chrome" /v PrintHeaderFooter /f >nul 2>&1

echo Shortcut dan policy dihapus.
echo Profil kasir tetap ada di %LOCALAPPDATA%\LakuPOS\chrome-kasir
echo Hapus folder itu hanya setelah semua nota offline terkirim.
pause

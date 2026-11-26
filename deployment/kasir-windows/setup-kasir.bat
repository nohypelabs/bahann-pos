@echo off
rem Laku POS cashier PC setup (Windows 10/11). Run once per Windows user, no admin needed.
rem Creates the "Laku POS Kasir" shortcut on the desktop and in Startup, and turns off
rem Chrome's print header and footer. See README.md in this folder.
setlocal

rem The app address. Change this line when the domain changes, then run the script again.
set "LAKUPOS_URL=https://lakupos.vercel.app/pos/notes"

rem A Chrome profile only for the cashier, so kiosk printing works even when Chrome is
rem already open for normal browsing. Offline notes waiting to sync live in this folder.
set "PROFILE_DIR=%LOCALAPPDATA%\LakuPOS\chrome-kasir"

set "CHROME="
for %%P in ("%ProgramFiles%\Google\Chrome\Application\chrome.exe" "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe") do (
  if exist "%%~P" set "CHROME=%%~P"
)
if not defined CHROME (
  echo Google Chrome tidak ditemukan. Install Chrome dulu, lalu jalankan file ini lagi.
  pause
  exit /b 1
)

if not exist "%PROFILE_DIR%" mkdir "%PROFILE_DIR%"

rem Chrome policy for this Windows user: never print the date/URL header and page footer.
reg add "HKCU\Software\Policies\Google\Chrome" /v PrintHeaderFooter /t REG_DWORD /d 0 /f >nul
if errorlevel 1 (
  echo Gagal menulis policy Chrome PrintHeaderFooter.
  pause
  exit /b 1
)

set "LP_CHROME=%CHROME%"
set "LP_ARGS=--kiosk-printing --user-data-dir="%PROFILE_DIR%" --no-first-run --no-default-browser-check --app=%LAKUPOS_URL%"
set "LP_DIR=%PROFILE_DIR%"
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$w = New-Object -ComObject WScript.Shell;" ^
  "foreach ($folder in 'Desktop','Startup') {" ^
  "  $lnk = $w.CreateShortcut((Join-Path ([Environment]::GetFolderPath($folder)) 'Laku POS Kasir.lnk'));" ^
  "  $lnk.TargetPath = $env:LP_CHROME; $lnk.Arguments = $env:LP_ARGS; $lnk.WorkingDirectory = $env:LP_DIR;" ^
  "  $lnk.IconLocation = $env:LP_CHROME + ',0'; $lnk.Description = 'Laku POS kasir'; $lnk.Save() }"
if errorlevel 1 (
  echo Gagal membuat shortcut.
  pause
  exit /b 1
)

echo.
echo Selesai. Shortcut "Laku POS Kasir" ada di Desktop dan ikut terbuka saat komputer menyala.
echo Alamat : %LAKUPOS_URL%
echo Profil : %PROFILE_DIR%
echo.
echo Langkah berikutnya (sekali saja, lihat README.md):
echo  1. Buka shortcut, login sebagai kasir.
echo  2. Cetak satu struk lewat dialog: printer struk, Margins None. Setelah itu struk langsung tercetak.
echo  3. Buka Nota Servis saat online supaya data barang dan member tersimpan untuk mode offline.
pause

@echo off
rem Opens the cashier profile WITHOUT kiosk printing, so the print dialog shows once.
rem Close the "Laku POS Kasir" window first: a second start joins the running Chrome and keeps its flags.
setlocal

rem Keep in sync with setup-kasir.bat.
set "LAKUPOS_URL=https://lakupos.vercel.app/pos/notes"
set "PROFILE_DIR=%LOCALAPPDATA%\LakuPOS\chrome-kasir"

set "CHROME="
for %%P in ("%ProgramFiles%\Google\Chrome\Application\chrome.exe" "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe") do (
  if exist "%%~P" set "CHROME=%%~P"
)
if not defined CHROME (
  echo Google Chrome tidak ditemukan.
  pause
  exit /b 1
)

echo Tutup dulu jendela "Laku POS Kasir" kalau masih terbuka, lalu tekan sembarang tombol.
pause >nul
start "" "%CHROME%" --user-data-dir="%PROFILE_DIR%" --no-first-run --no-default-browser-check --app=%LAKUPOS_URL%
echo.
echo Cetak satu struk: pilih printer struk, More settings: Margins None, Scale Default, lalu Print.
echo Setelah itu tutup jendela ini dan buka lagi lewat shortcut "Laku POS Kasir".
pause

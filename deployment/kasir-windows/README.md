# Cashier PC setup (Windows)

Everything needed to set up a client's cashier PC on site: the receipt printer driver, a Chrome shortcut that prints
receipts without a dialog, and the Chrome policy that keeps the date header and page footer off receipts.
Copy this folder to a flash drive before the visit (the driver is not in git, see `drivers/README.md`).

| File | Purpose |
|---|---|
| `setup-kasir.bat` | Creates the "Laku POS Kasir" shortcut on the desktop and in Startup; sets the Chrome policy `PrintHeaderFooter = 0` for the Windows user. No admin needed |
| `print-settings-once.bat` | Opens the cashier profile without kiosk printing, so the print dialog appears once to save the receipt settings |
| `remove-kasir.bat` | Removes the shortcuts and the policy; keeps the cashier profile |
| `drivers/` | The receipt printer driver, from an official source only |

Why a shortcut and not an installed PWA: `--kiosk-printing` only applies when Chrome starts with it. An installed
PWA shares the user's normal Chrome profile, so if Chrome is already open for browsing, the PWA joins that process and
the print dialog comes back. The shortcut uses its own profile (`%LOCALAPPDATA%\LakuPOS\chrome-kasir`), so it always
starts its own Chrome. `--app=` gives it a window without an address bar or tabs, like a PWA.

Tested on Linux with the same printer on 27 Nov 2026 (E2E log entry 16). **Not yet tested on Windows.**

## On site, in this order

1. **Chrome.** Install Google Chrome if it is missing.
2. **Printer driver** from `drivers/`. Then in Windows printer settings:
   - make the receipt printer the default printer;
   - paper: 80 mm roll (pick an 80 × 210 mm or "receipt" size if the driver offers one);
   - auto cut after the job: on;
   - cash drawer: "open drawer" after printing, if the drawer is plugged into the printer;
   - print a Windows test page.
3. **Run `setup-kasir.bat`** (double-click).
4. **First start of the shortcut:**
   1. Log in as the cashier. Close the window and open it again: the login must still be there.
   2. Close the window and run `print-settings-once.bat`. It opens the same profile without kiosk printing (inside
      the kiosk window even Ctrl+P prints without a dialog). Print one receipt **through the dialog**: destination =
      the receipt printer, Margins **None**, Scale **Default**. Kiosk printing reuses these settings; without this
      step Chrome uses its defaults and wastes paper. Close the window.
   3. Print the next receipt from the shortcut: it must come out straight away, starting at the top of the paper,
      with no date or page number on it, and be cut after the barcode.
5. **Offline:** open "Nota Servis" once while online, then pull the network cable and check that notes still open
   and a cash sale still prints.
6. Show the cashier where "Buka Shift" is (Kasir page and Nota Servis), and the rules in the go-live notes
   (never clear browser data, never use incognito on this PC).

If receipts come out with metres of blank paper or start far down the page: the driver is scaling or centring the
page. Turn off any "fit to page" or scaling in the driver, keep Margins None in Chrome, and see E2E log entry 16
for how this was solved with CUPS on Linux.

## When the domain changes

The address is one line near the top of `setup-kasir.bat` and `print-settings-once.bat` (`LAKUPOS_URL`).

1. **Before switching,** make sure no offline notes are waiting: the sync bar on Nota Servis shows nothing unsent.
   Browser data is kept per address, so anything unsent under the old address stays there.
2. Edit `LAKUPOS_URL` in both files, run `setup-kasir.bat` again (it overwrites the shortcuts).
3. Repeat step 4 and 5 above: log in again, one print through the dialog, open Nota Servis online.

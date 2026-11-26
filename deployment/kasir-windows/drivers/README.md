# Printer and scanner drivers

Put the Windows driver for the receipt printer here before going on site, so nothing has to be downloaded there.

Only use a driver from an official source:
- the CD or flash drive in the printer box, or
- a link from Iware itself (the Iware official store, or the seller's official support).

Third-party driver sites (for example generic "Xprinter" driver mirrors) were checked on 27 Nov 2026 and not used:
they say themselves that rebadged printers are not guaranteed to match, and the file would run on the client's PC.

Files in this folder are not committed (see `.gitignore`): vendor installers are large binaries with their own
licence. Copy this whole `kasir-windows` folder to a flash drive for the visit.

The barcode scanner (Metrologic, USB) works as a keyboard and needs no driver.

| Device | Model | Driver file | Source | Checked |
|---|---|---|---|---|
| Receipt printer | Iware XS80 (USB `0418:5011`, reports as "POS-80") | | | |

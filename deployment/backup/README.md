# Database backup

Supabase production runs on the Free plan, which has no automatic or downloadable backups.
These scripts provide the backups the client contract promises (Pasal 7 ayat 2, Pasal 13 ayat 5).

| File | Runs on | Purpose |
|---|---|---|
| `lakupos-backup.sh` | VPS, daily from cron | `pg_dump` of schema `public`, verify, encrypt, rotate, optional off-site copy |
| `backup.env.example` | VPS | Config template for `/etc/lakupos-backup.env` |
| `lakupos-backup-pull.sh` | Second machine, daily from cron | Pulls the encrypted dumps from the VPS (read-only), keeps 56 days |
| `lakupos-restore-test.sh` | Laptop | Restores a backup into a throwaway Postgres 17 container and counts rows |

## Where it runs (since 26 Nov 2026)

| What | Where |
|---|---|
| Daily dump, 02:30 WIB | Helipod VPS (Ubuntu 24.04, TZ Asia/Jakarta), user `lakupos-backup`, `/etc/cron.d/lakupos-backup`, dumps in `/var/backups/lakupos`, log `/var/log/lakupos-backup/backup.log` |
| Database login | Role `lakupos_backup` on Supabase: `pg_read_all_data` + `BYPASSRLS` (RLS is on for every table), read-only by default, 2 connections. It cannot write, and no `SECURITY DEFINER` function is open to it. The VPS never holds the `postgres` password |
| Second copy, 03:15 WIB | PC Ryzen agent server (`edura-server`), user `dracarys`, `~/.lakupos-backup` (ext4 data disk on HDD D, not visible from Windows), config `~/.config/lakupos-backup-pull.env`, log `~/.local/state/lakupos-backup-pull.log` |
| Pull key | `~/.ssh/id_lakupos_backup_pull` on PC Ryzen; on the VPS it is limited to `restrict,command="/usr/bin/rrsync -ro /var/backups/lakupos"` |
| Decryption key | `~/.config/lakupos-backup/lakupos-backup.key` on the laptop, plus the user's password manager. Never on the VPS or PC Ryzen |

**Alerts (Telegram, bot @agdsgrid_bot, reused from the idle smart-grid-bot):**
- Helipod sends "⚠️ Backup … GAGAL" when a dump fails.
- PC Ryzen sends "⚠️ Salinan backup … GAGAL" when the pull fails or the VPS has no dump newer than 26 hours,
  which also covers the VPS being down or expired.
- PC Ryzen sends "✅ Backup … aman" every Sunday. No Sunday message means PC Ryzen itself may be down.
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `HOST_LABEL` live in each machine's config file. The token is passed to
  curl on stdin, so it does not show in `ps` on the shared agent server.
- Test: `FORCE_SUMMARY=1 ~/.local/bin/lakupos-backup-pull.sh` on PC Ryzen sends the weekly message now.

To change the role's password: `alter role lakupos_backup password '…'` on Supabase, then update `DATABASE_URL`
in `/etc/lakupos-backup.env` (user `lakupos_backup.<project-ref>`, session pooler port 5432).

All app data lives in schema `public` (`auth.users` is empty; the app uses its own JWT auth).
Production is Postgres 17, so `pg_dump` must be version 17 or newer.

## Install on the VPS

```bash
# Postgres client 17+ (Debian/Ubuntu: add the PGDG apt repo first), age, and optionally rclone
sudo apt install postgresql-client-17 age rclone

sudo install -m 755 lakupos-backup.sh /usr/local/bin/lakupos-backup.sh
sudo install -m 600 backup.env.example /etc/lakupos-backup.env
sudo nano /etc/lakupos-backup.env   # fill DATABASE_URL and AGE_RECIPIENT

# Run once by hand and check the output
sudo -u lakupos-backup /usr/local/bin/lakupos-backup.sh

# Daily at 02:30 server time, as a non-root user that owns /etc/lakupos-backup.env and the backup dir
echo '30 2 * * * lakupos-backup /usr/local/bin/lakupos-backup.sh >> /var/log/lakupos-backup/backup.log 2>&1' \
  | sudo tee /etc/cron.d/lakupos-backup
```

Second copy (on another machine, pulled so the VPS holds no key to it): put
`restrict,command="/usr/bin/rrsync -ro /var/backups/lakupos" <pull key>` in the backup user's
`authorized_keys` on the VPS, then on the second machine:

```bash
install -m 755 lakupos-backup-pull.sh ~/.local/bin/
printf 'SOURCE=lakupos-backup@<vps>\nSSH_PORT=<port>\nDEST=$HOME/.lakupos-backup\nKEEP_DAYS=56\n' > ~/.config/lakupos-backup-pull.env
(crontab -l; echo '15 3 * * * $HOME/.local/bin/lakupos-backup-pull.sh >> $HOME/.local/state/lakupos-backup-pull.log 2>&1') | crontab -
```

- `DATABASE_URL`: Supabase dashboard > Connect > **Session pooler**, port 5432. The transaction pooler
  (port 6543) is for the app and does not suit `pg_dump`.
- Encryption: generate the key pair on the laptop with `age-keygen -o lakupos-backup.key`. Put only the
  public key (`age1...`) in `AGE_RECIPIENT`. Keep the private key off the VPS, with a second copy somewhere
  safe: without it the backups cannot be read.
- The dumps contain customer personal data. Keep them encrypted and inside the retention below.

## Retention

- VPS: 14 daily + 8 weekly (Sunday) dumps.
- Second copy (pull): 56 days. It never mirrors deletions from the VPS.
- Off-site (rclone, not used now): 56 days.

All copies stay inside the contract's limit of 60 days for deleting backup copies after the service ends
(Pasal 13 ayat 10). When a client leaves, delete their backups by hand within that limit.

## Test a restore (do this monthly)

```bash
scp vps:/var/backups/lakupos/daily/<latest>.dump.age .
./lakupos-restore-test.sh <latest>.dump.age ~/path/to/lakupos-backup.key
```

It prints `restore: OK`, the table and row counts, and the latest applied migration.
Tested on 23 Nov 2026 against production: 38 tables, 586 rows, latest migration `052_plan_expiry.sql`.
Tested on 26 Nov 2026 from the PC Ryzen copy of the first Helipod dump: 48 tables, 2892 rows, latest migration
`059_tenant_isolation_hardening.sql`; transactions, service_orders, transaction_items and payments matched production.

## Restore after a disaster

1. Create or reset a Supabase project in the same region (ap-southeast-1).
2. Decrypt the dump: `age -d -i lakupos-backup.key -o restore.dump <file>.dump.age`.
3. Make sure `pg_trgm` exists in schema `public` (it does in a new Supabase project only if created):
   `create extension if not exists pg_trgm with schema public;`
4. Restore with a local `pg_restore` at least as new as the `pg_dump` that made the file:
   `pg_restore --no-owner -d "<session pooler URL>" restore.dump`
   The error `schema "public" already exists` is expected.
5. Point the app's env vars at the project if it changed, then run the E2E tests.

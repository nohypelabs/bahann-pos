# Database backup

Supabase production runs on the Free plan, which has no automatic or downloadable backups.
These scripts provide the backups the client contract promises (Pasal 7 ayat 2, Pasal 13 ayat 5).

| File | Runs on | Purpose |
|---|---|---|
| `lakupos-backup.sh` | VPS, daily from cron | `pg_dump` of schema `public`, verify, encrypt, rotate, optional off-site copy |
| `backup.env.example` | VPS | Config template for `/etc/lakupos-backup.env` |
| `lakupos-restore-test.sh` | Laptop | Restores a backup into a throwaway Postgres 17 container and counts rows |

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
sudo /usr/local/bin/lakupos-backup.sh

# Daily at 02:30 server time
echo '30 2 * * * root /usr/local/bin/lakupos-backup.sh >> /var/log/lakupos-backup.log 2>&1' \
  | sudo tee /etc/cron.d/lakupos-backup
```

- `DATABASE_URL`: Supabase dashboard > Connect > **Session pooler**, port 5432. The transaction pooler
  (port 6543) is for the app and does not suit `pg_dump`.
- Encryption: generate the key pair on the laptop with `age-keygen -o lakupos-backup.key`. Put only the
  public key (`age1...`) in `AGE_RECIPIENT`. Keep the private key off the VPS, with a second copy somewhere
  safe: without it the backups cannot be read.
- The dumps contain customer personal data. Keep them encrypted and inside the retention below.

## Retention

- VPS: 14 daily + 8 weekly (Sunday) dumps.
- Off-site (rclone): 56 days.

Both stay inside the contract's limit of 60 days for deleting backup copies after the service ends
(Pasal 13 ayat 10). When a client leaves, delete their backups by hand within that limit.

## Test a restore (do this monthly)

```bash
scp vps:/var/backups/lakupos/daily/<latest>.dump.age .
./lakupos-restore-test.sh <latest>.dump.age ~/path/to/lakupos-backup.key
```

It prints `restore: OK`, the table and row counts, and the latest applied migration.
Tested on 23 Nov 2026 against production: 38 tables, 586 rows, latest migration `052_plan_expiry.sql`.

## Restore after a disaster

1. Create or reset a Supabase project in the same region (ap-southeast-1).
2. Decrypt the dump: `age -d -i lakupos-backup.key -o restore.dump <file>.dump.age`.
3. Make sure `pg_trgm` exists in schema `public` (it does in a new Supabase project only if created):
   `create extension if not exists pg_trgm with schema public;`
4. Restore with a local `pg_restore` at least as new as the `pg_dump` that made the file:
   `pg_restore --no-owner -d "<session pooler URL>" restore.dump`
   The error `schema "public" already exists` is expected.
5. Point the app's env vars at the project if it changed, then run the E2E tests.

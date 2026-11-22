#!/usr/bin/env bash
# Daily logical backup of the Laku POS database (schema "public") from Supabase.
# Runs on the VPS from cron. Config lives in /etc/lakupos-backup.env (see backup.env.example).
set -euo pipefail
umask 077

CONFIG="${LAKUPOS_BACKUP_CONFIG:-/etc/lakupos-backup.env}"
# shellcheck source=/dev/null
source "$CONFIG"

: "${DATABASE_URL:?DATABASE_URL is not set in $CONFIG}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/lakupos}"
KEEP_DAILY="${KEEP_DAILY:-14}"
KEEP_WEEKLY="${KEEP_WEEKLY:-8}"
MIN_TABLES="${MIN_TABLES:-30}"
OFFSITE_KEEP_DAYS="${OFFSITE_KEEP_DAYS:-56}"

log() { echo "$(date '+%F %T') $*"; }
ping_hc() { [ -n "${HEALTHCHECK_URL:-}" ] && curl -fsS -m 10 --retry 3 -o /dev/null "${HEALTHCHECK_URL}$1" || true; }

mkdir -p "$BACKUP_DIR/daily" "$BACKUP_DIR/weekly" "$BACKUP_DIR/tmp"
exec 9>"$BACKUP_DIR/.lock"
flock -n 9 || { log "another backup is still running"; exit 1; }

tmp="$BACKUP_DIR/tmp/current.dump"
trap 'rc=$?; rm -f "$tmp"; if [ $rc -ne 0 ]; then log "FAILED (exit $rc)"; ping_hc /fail; fi' EXIT
ping_hc /start

# pg_dump must be at least as new as the server, or it refuses to dump.
server_major=$(psql "$DATABASE_URL" -Atc "show server_version_num" | cut -c1-2)
client_major=$(pg_dump --version | grep -oE '[0-9]+' | head -1)
if [ "$client_major" -lt "$server_major" ]; then
  log "pg_dump $client_major is older than server $server_major; install postgresql-client-$server_major"
  exit 2
fi

log "dumping schema public (server $server_major, pg_dump $client_major)"
pg_dump "$DATABASE_URL" --schema=public --format=custom --file="$tmp"

# A dump that cannot be listed, or has too few tables, is not a backup.
tables=$(pg_restore --list "$tmp" | grep -c ' TABLE DATA ' || true)
if [ "$tables" -lt "$MIN_TABLES" ]; then
  log "dump has only $tables tables with data (expected at least $MIN_TABLES)"
  exit 3
fi

name="lakupos-$(date +%F_%H%M).dump"
if [ -n "${AGE_RECIPIENT:-}" ]; then
  age -r "$AGE_RECIPIENT" -o "$BACKUP_DIR/daily/$name.age" "$tmp"
  name="$name.age"
else
  mv "$tmp" "$BACKUP_DIR/daily/$name"
fi
file="$BACKUP_DIR/daily/$name"
# Sundays are also kept as weekly backups.
[ "$(date +%u)" = 7 ] && ln -f "$file" "$BACKUP_DIR/weekly/$name"
log "saved $file ($(du -h "$file" | cut -f1), $tables tables)"

prune() { ls -1t "$1" | tail -n +"$(($2 + 1))" | while read -r f; do rm -f -- "$1/$f"; done; }
prune "$BACKUP_DIR/daily" "$KEEP_DAILY"
prune "$BACKUP_DIR/weekly" "$KEEP_WEEKLY"

if [ -n "${RCLONE_REMOTE:-}" ]; then
  rclone copy "$file" "$RCLONE_REMOTE/"
  rclone delete "$RCLONE_REMOTE/" --min-age "${OFFSITE_KEEP_DAYS}d"
  log "copied off-site to $RCLONE_REMOTE (keeping $OFFSITE_KEEP_DAYS days)"
fi

ping_hc ""
log "done"

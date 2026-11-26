#!/usr/bin/env bash
# Second copy of the Laku POS backups: pulls the encrypted dumps from the backup VPS.
# Runs from cron on another machine. It pulls rather than the VPS pushing, so the VPS
# holds no key to this machine, and the VPS key only allows read-only rsync (rrsync -ro).
# Files deleted on the VPS stay here; this copy prunes itself after KEEP_DAYS, inside
# the contract's 60-day limit for backup copies (Pasal 13 ayat 10).
# Config: ~/.config/lakupos-backup-pull.env (see the README).
set -euo pipefail
umask 077

CONFIG="${LAKUPOS_PULL_CONFIG:-$HOME/.config/lakupos-backup-pull.env}"
# shellcheck source=/dev/null
source "$CONFIG"

: "${SOURCE:?SOURCE is not set in $CONFIG}"   # user@host of the backup VPS
: "${DEST:?DEST is not set in $CONFIG}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/id_lakupos_backup_pull}"
SSH_PORT="${SSH_PORT:-22}"
KEEP_DAYS="${KEEP_DAYS:-56}"
MAX_AGE_HOURS="${MAX_AGE_HOURS:-26}"

log() { echo "$(date '+%F %T') $*"; }
# Telegram alert. The token goes through curl's stdin config, so it never shows in `ps`.
notify() {
  [ -n "${TELEGRAM_BOT_TOKEN:-}" ] && [ -n "${TELEGRAM_CHAT_ID:-}" ] || return 0
  printf 'url = "https://api.telegram.org/bot%s/sendMessage"\n' "$TELEGRAM_BOT_TOKEN" \
    | curl -fsS -m 15 --retry 2 -o /dev/null -K - --data-urlencode "chat_id=$TELEGRAM_CHAT_ID" --data-urlencode "text=$1" || true
}
HOST_LABEL="${HOST_LABEL:-$(hostname)}"
trap 'rc=$?; if [ $rc -ne 0 ]; then log "FAILED (exit $rc)"; notify "⚠️ Salinan backup Laku POS di $HOST_LABEL GAGAL (exit $rc): VPS backup tidak terjangkau atau tidak membuat backup baru. Cek ~/.local/state/lakupos-backup-pull.log"; fi' EXIT

mkdir -p "$DEST"
# rrsync on the VPS roots paths at its backup directory.
rsync -a --ignore-existing --exclude 'tmp/' --exclude '.lock' \
  -e "ssh -i $SSH_KEY -p $SSH_PORT -o BatchMode=yes -o IdentitiesOnly=yes" \
  "$SOURCE:daily" "$SOURCE:weekly" "$DEST/"

find "$DEST" -type f -name 'lakupos-*.dump*' -mtime +"$KEEP_DAYS" -delete

# rsync keeps the VPS timestamps, so this catches a VPS that stopped making backups.
fresh=$(find "$DEST" -type f -name 'lakupos-*.dump*' -mmin -"$((MAX_AGE_HOURS * 60))" | wc -l)
if [ "$fresh" -eq 0 ]; then
  log "no backup newer than $MAX_AGE_HOURS hours on the VPS"
  exit 4
fi
count=$(find "$DEST" -type f -name 'lakupos-*.dump*' | wc -l)
log "ok: $count files, $(du -sh "$DEST" | cut -f1)"
# A weekly all-clear, so silence itself is a warning (this machine may be the one that is down).
if [ "$(date +%u)" = 7 ] || [ "${FORCE_SUMMARY:-0}" = 1 ]; then
  newest=$(find "$DEST" -type f -name 'lakupos-*.dump*' -printf '%T@ %f\n' | sort -n | tail -1 | cut -d' ' -f2)
  notify "✅ Backup database Laku POS aman. Terbaru: $newest. Tersimpan $count file di $HOST_LABEL. Kalau pesan mingguan ini tidak datang hari Minggu, cek server."
fi

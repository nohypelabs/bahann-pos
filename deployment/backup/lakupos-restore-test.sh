#!/usr/bin/env bash
# Proves a backup can be restored: loads it into a throwaway Postgres 17 container and counts rows.
# Run on the laptop. Usage: ./lakupos-restore-test.sh <backup.dump[.age]> [age-identity-file]
set -euo pipefail
umask 077

backup="${1:?usage: $0 <backup.dump[.age]> [age-identity-file]}"
identity="${2:-}"
image="${PG_IMAGE:-postgres:17}"
name="lakupos-restore-test-$$"
work=$(mktemp -d)
trap 'docker rm -f "$name" >/dev/null 2>&1 || true; rm -rf "$work"' EXIT

dump="$backup"
if [[ "$backup" == *.age ]]; then
  : "${identity:?an .age backup needs the age identity (private key) file}"
  dump="$work/backup.dump"
  age -d -i "$identity" -o "$dump" "$backup"
fi

docker run -d --name "$name" -e POSTGRES_PASSWORD=test "$image" >/dev/null
until docker exec "$name" pg_isready -U postgres -q 2>/dev/null; do sleep 1; done
sleep 2
psql() { docker exec -i "$name" psql -U postgres -v ON_ERROR_STOP=1 -q "$@"; }

# Stand-ins for what Supabase provides, so policies and functions in the dump can be created.
psql <<'SQL'
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
create function auth.jwt() returns jsonb language sql stable as $$ select '{}'::jsonb $$;
create function auth.role() returns text language sql stable as $$ select null::text $$;
create schema extensions;
create extension pgcrypto with schema extensions;
create extension "uuid-ossp" with schema extensions;
create extension pg_trgm with schema public;
SQL

errors="$work/restore-errors.log"
docker exec -i "$name" pg_restore -U postgres -d postgres --no-owner --no-privileges <"$dump" 2>"$errors" || true
# "schema public already exists" is expected: every Postgres database starts with it.
real_errors=$(grep -E '^pg_restore: error' "$errors" | grep -v 'schema "public" already exists' || true)
if [ -z "$real_errors" ]; then
  echo "restore: OK"
else
  echo "restore: FAILED"
  echo "$real_errors" | sort | uniq -c | head -20
  exit 1
fi

psql -c "analyze" >/dev/null
echo
psql -At -F $'\t' -c "select count(*) || ' tables, ' || sum(n_live_tup) || ' rows' from pg_stat_user_tables where schemaname = 'public'"
psql -At -F $'\t' -c "select relname, n_live_tup from pg_stat_user_tables where schemaname = 'public' order by n_live_tup desc limit 10" | column -t
psql -At -c "select 'latest migration: ' || max(filename) from public._migrations" 2>/dev/null || true

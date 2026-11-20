#!/usr/bin/env bash
# Τρέχει schema.sql + όλα τα migrations με τη σειρά σε μια άδεια βάση Postgres, για να πιάνονται λάθη SQL πριν το Merge.
# Μετά τα ξανατρέχει όλα (τα migrations πρέπει να μπορούν να ξανατρέξουν).
# Χρήση: PGHOST=… PGPORT=… PGUSER=postgres scripts/elegxos-sql.sh   (στο CI: .github/workflows/sql.yml)
# ΔΕΝ αγγίζει την πραγματική βάση Supabase.
set -euo pipefail
cd "$(dirname "$0")/.."
DB=${DB:-spoton_ci}
export PGOPTIONS="${PGOPTIONS:-} -c client_min_messages=warning"
psql -q -v ON_ERROR_STOP=1 -d postgres -c "drop database if exists $DB" -c "create database $DB"
run() { # $1 = αρχείο· το pg_cron δεν υπάρχει σε σκέτο Postgres, το αντικαθιστά το supabase/ci/stubs.sql
  sed -E 's/^\s*create extension if not exists pg_cron\s*;//I' "$1" | psql -q -X -v ON_ERROR_STOP=1 -d "$DB" -f - >/dev/null \
    || { echo "::error file=$1::Λάθος στο $1"; exit 1; }
  echo "✓ $1"
}
run supabase/ci/stubs.sql
run supabase/schema.sql
for f in supabase/migrations/*.sql; do run "$f"; done
echo "— δεύτερη φορά (πρέπει να ξανατρέχουν χωρίς λάθος) —"
for f in supabase/migrations/*.sql; do run "$f"; done
echo "Όλα τα migrations τρέχουν."

#!/bin/sh
set -eu

# A new container has no Quartz output yet. Build from the read-only vault before
# serving, so a recreated container has the same behavior as a manually synced one.
started_at=$(date +%s)
bash ./build.sh
SYNC_DURATION_SECONDS="$(( $(date +%s) - started_at ))" node ./scripts/record-sync-state.js
exec "$@"

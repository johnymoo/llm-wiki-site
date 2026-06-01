#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

QUARTZ_CONTENT="quartz/content"

restore_content_gitkeep() {
  mkdir -p "$SCRIPT_DIR/$QUARTZ_CONTENT"
  touch "$SCRIPT_DIR/$QUARTZ_CONTENT/.gitkeep"
}

trap restore_content_gitkeep EXIT

if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

VAULT_DIR="${VAULT_DIR:-../llm-knowledge-vault}"
if [[ "$VAULT_DIR" != /* ]]; then
  VAULT_DIR="$SCRIPT_DIR/$VAULT_DIR"
fi

if [ ! -d "$VAULT_DIR" ]; then
  echo "Error: vault directory not found at $VAULT_DIR" >&2
  exit 1
fi

VAULT_DIR="$(cd "$VAULT_DIR" && pwd)"

echo "=== Syncing vault content from $VAULT_DIR ==="

rm -rf "$QUARTZ_CONTENT"
mkdir -p "$QUARTZ_CONTENT"

mapfile -t RSYNC_EXCLUDES < <(node scripts/sync-excludes.js)
rsync -av --delete "${RSYNC_EXCLUDES[@]}" "$VAULT_DIR/" "$QUARTZ_CONTENT/"

node scripts/normalize-frontmatter.js "$QUARTZ_CONTENT"

rm -f "$QUARTZ_CONTENT/SCHEMA.md"
rm -f "$QUARTZ_CONTENT/log.md"

if [ -f overrides/index.md ]; then
  cp overrides/index.md "$QUARTZ_CONTENT/index.md"
fi

cp overrides/quartz.config.ts quartz/quartz.config.ts
cp overrides/quartz.layout.ts quartz/quartz.layout.ts

if [ -d overrides/components ] && [ "$(ls -A overrides/components 2>/dev/null)" ]; then
  mkdir -p quartz/quartz/components
  cp -r overrides/components/* quartz/quartz/components/
fi

echo "=== Building Quartz ==="
if [ ! -d quartz/node_modules ]; then
  echo "Error: Quartz dependencies are missing. Run: cd quartz && npm ci" >&2
  exit 1
fi

cd quartz
npx quartz build

echo "=== Build complete ==="

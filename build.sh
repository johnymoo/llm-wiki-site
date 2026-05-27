#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

WIKI_DIR="../llm-wiki"
QUARTZ_CONTENT="quartz/content"

if [ ! -d "$WIKI_DIR" ]; then
  echo "Error: Wiki directory not found at $WIKI_DIR"
  exit 1
fi

echo "=== Syncing wiki content ==="

# Clean previous content
rm -rf "$QUARTZ_CONTENT"/*

# Copy wiki content excluding code/ and queries/
rsync -av \
  --exclude='code/' \
  --exclude='queries/' \
  --exclude='.git/' \
  --exclude='node_modules/' \
  "$WIKI_DIR/" "$QUARTZ_CONTENT/"

# Remove internal docs that shouldn't appear in navigation
rm -f "$QUARTZ_CONTENT/SCHEMA.md"
rm -f "$QUARTZ_CONTENT/log.md"

# Copy custom index page if it exists (created in later tasks)
if [ -f overrides/index.md ]; then
  cp overrides/index.md "$QUARTZ_CONTENT/index.md"
fi

# Copy config overrides into quartz/
cp overrides/quartz.config.ts quartz/quartz.config.ts
cp overrides/quartz.layout.ts quartz/quartz.layout.ts

# Copy custom components if they exist (created in later tasks)
if [ -d overrides/components ] && [ "$(ls -A overrides/components 2>/dev/null)" ]; then
  mkdir -p quartz/quartz/components
  cp -r overrides/components/* quartz/quartz/components/
fi

echo "=== Building Quartz ==="
cd quartz && npx quartz build

echo "=== Build complete ==="

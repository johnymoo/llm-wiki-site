# LLM Wiki Website Design Spec

## Overview

Convert the `llm-wiki` markdown knowledge base into a browsable website using Quartz v4. The wiki remains the single source of content; a build script copies content into Quartz for static site generation. A lightweight Express server wraps the static site to provide a user-triggered sync mechanism.

**Goal:** Personal knowledge base accessible via browser at `0.0.0.0` on LAN.

## Architecture

```
llm-wiki/                    llm-wiki-site/
├── entities/                ├── quartz/              ← Quartz v4 (cloned)
├── concepts/                │   ├── content/         ← populated by build.sh
├── comparisons/             │   ├── public/
├── study/                   │   ├── quartz.config.ts
├── raw/                     │   ├── quartz.layout.ts
│   ├── articles/            │   └── plugins/         ← custom sync UI component
│   ├── assets/              ├── server.js            ← Express: sync API + static serving
│   └── papers/              ├── build.sh             ← sync wiki → quartz/content + build
└── code/ (excluded)         ├── package.json
                             ├── sync-state.json
                             └── .gitignore
```

### Workflow

1. Edit markdown in `llm-wiki/` (unchanged from today)
2. Run `node server.js` in `llm-wiki-site/`
3. Open browser at `http://<host>:49345`
4. Browse wiki with full features (wikilinks, backlinks, search, graph, tags)
5. When wiki content changes, user clicks Sync button or accepts sync prompt

## Features

| Feature | Quartz Component | Notes |
|---------|-----------------|-------|
| Wikilinks | `Plugin.ObsidianFlavoredMarkdown` | Built-in `[[wikilinks]]` resolution |
| Backlinks | `Component.Backlinks` | Auto-generated incoming links panel |
| Search | `Component.Search` | Client-side full-text search |
| Knowledge Graph | `Component.Graph` | Interactive force-directed graph |
| Tags | `Component.TagList` + tag pages | Auto-generated from frontmatter |
| Category Browse | Folder-based navigation | entities/, concepts/, comparisons/, study/ |

## Content Mapping

**Included content** (everything except `code/`):
- `entities/*.md` → `/entities/<slug>`
- `concepts/*.md` → `/concepts/<slug>`
- `comparisons/*.md` → `/comparisons/<slug>`
- `study/*.md` → `/study/<slug>`
- `raw/articles/*.md` → `/raw/articles/<slug>`
- `raw/assets/*.jpg` → accessible as images

**Excluded:**
- `code/` (full Odoo repo, 47k+ files)
- `queries/` (empty directory)
- `SCHEMA.md`, `log.md` (internal docs, excluded from navigation)

**Frontmatter mapping** (wiki → Quartz):
- `title` → page title (already compatible)
- `type` → visible category badge on page
- `tags` → Quartz native tag system
- `created`/`updated` → page metadata display
- `sources` → rendered as source links

## Build Script (`build.sh`)

```bash
#!/bin/bash
set -e

# 1. Clean previous content
rm -rf quartz/content/*

# 2. Copy wiki content (excluding code/ and queries/)
rsync -av --exclude='code/' --exclude='queries/' \
  ../llm-wiki/ quartz/content/

# 3. Remove internal docs from navigation
rm -f quartz/content/SCHEMA.md quartz/content/log.md

# 4. Build Quartz
cd quartz && npx quartz build
```

## Sync Server (`server.js`)

Express server providing:

### Endpoints

**`GET /api/status`**
```json
{
  "lastSyncTime": "2026-05-27T10:30:00Z",
  "duration": 12.5,
  "success": true,
  "contentHash": "abc123..."
}
```

**`POST /api/sync`**
```json
// Request: empty body
// Response:
{
  "success": true,
  "lastSyncTime": "2026-05-27T10:35:00Z",
  "duration": 11.2,
  "pagesCount": 57
}
```

### Behavior
- Acquires lock before sync (prevent concurrent builds)
- Records `{ timestamp, duration, success, contentHash }` to `sync-state.json`
- Computes content hash from wiki file mtimes for change detection
- Returns JSON result, releases lock

## Sync UI (Quartz Custom Component)

Injected into every page via Quartz plugin.

### Bottom Bar (always visible)
```
┌─────────────────────────────────────────────┐
│ 🔄 Last synced: 5 min ago         [Sync]   │
└─────────────────────────────────────────────┘
```

### Stale Content Toast (on page load, if content changed)
```
┌──────────────────────────────────────────────────┐
│ Wiki content has changed since last sync.        │
│                                    [Sync now] [✕] │
└──────────────────────────────────────────────────┘
```

### Sync In Progress
```
┌─────────────────────────────────────────────┐
│ ⏳ Syncing... (building site)               │
└─────────────────────────────────────────────┘
```

**No automatic sync.** User is always in control. Toast dismissed until next page load.

## Deployment

### First-time Setup

```bash
cd llm-wiki-site

# Install dependencies
npm install

# Clone Quartz
git clone https://github.com/jackyzha0/quartz.git quartz
cd quartz && npm install && cd ..

# Initial build
./build.sh

# Start server
node server.js
```

### Running

```bash
node server.js    # starts on 0.0.0.0:49345
```

### Optional nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name wiki.local;

    location / {
        proxy_pass http://127.0.0.1:49345;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Success Criteria

1. All wiki content (entities, concepts, comparisons, study, raw) browsable on website
2. `[[wikilinks]]` resolve to actual pages
3. Backlinks panel shows incoming links
4. Full-text search works
5. Knowledge graph visualizes page connections
6. Tags browsable
7. Sync button triggers rebuild without manual shell access
8. Last sync time visible
9. Stale content prompt on page load
10. Accessible via LAN at `0.0.0.0:49345`

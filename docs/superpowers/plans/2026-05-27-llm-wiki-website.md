# LLM Wiki Website Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the `llm-wiki` markdown knowledge base into a browsable website with wikilinks, backlinks, search, graph, tags, and a user-triggered sync mechanism.

**Architecture:** Quartz v4 generates static HTML from wiki markdown. A build script copies content from `../llm-wiki` into Quartz's `content/` directory (excluding `code/`). An Express server wraps the static site, adding `/api/sync` and `/api/status` endpoints. A custom Quartz component renders a sync bar with status and trigger button.

**Tech Stack:** Quartz v4 (Preact/TSX), Express.js, rsync, Node.js

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `quartz/` (git clone)

- [ ] **Step 1: Clone Quartz v4 into the project**

```bash
<PRIVATE_URL>
git clone https://github.com/jackyzha0/quartz.git quartz
```

- [ ] **Step 2: Install Quartz dependencies**

```bash
cd quartz && npm install && cd ..
```

Expected: `node_modules/` created inside `quartz/`, no errors.

- [ ] **Step 3: Create `package.json`**

```json
{
  "name": "llm-wiki-site",
  "version": "1.0.0",
  "private": true,
  "description": "Express server wrapping Quartz v4 for llm-wiki",
  "scripts": {
    "build": "bash build.sh",
    "serve": "node server.js",
    "sync": "node -e \"fetch('http://localhost:49345/api/sync',{method:'POST'}).then(r=>r.json()).then(console.log)\""
  },
  "dependencies": {
    "express": "^4.21.0"
  }
}
```

- [ ] **Step 4: Install Express**

```bash
npm install
```

Expected: `node_modules/` and `package-lock.json` created at project root.

- [ ] **Step 5: Create `.gitignore`**

```gitignore
node_modules/
quartz/
sync-state.json
.superpowers/
```

- [ ] **Step 6: Initialize git repo**

```bash
git init
git add package.json package-lock.json .gitignore
git commit -m "chore: project scaffolding with express and quartz"
```

---

### Task 2: Quartz Configuration

**Files:**
- Modify: `quartz/quartz.config.ts`
- Modify: `quartz/quartz.layout.ts`

- [ ] **Step 1: Write `quartz.config.ts`**

Replace `quartz/quartz.config.ts` entirely:

```typescript
import { QuartzConfig } from "./quartz/cfg"
import * as Plugin from "./quartz/plugins"

const config: QuartzConfig = {
  configuration: {
    pageTitle: "LLM Wiki",
    pageTitleSuffix: "",
    enableSPA: true,
    enablePopovers: true,
    analytics: null,
    locale: "en-US",
    baseUrl: "",
    ignorePatterns: ["private", "templates", ".obsidian", "code", "queries"],
    defaultDateType: "created",
    theme: {
      fontOrigin: "googleFonts",
      cdnCaching: true,
      typography: {
        header: "Schibsted Grotesk",
        body: "Source Sans Pro",
        code: "IBM Plex Mono",
      },
      colors: {
        lightMode: {
          light: "#faf8f8",
          lightgray: "#e5e5e5",
          gray: "#b8b8b8",
          darkgray: "#4e4e4e",
          dark: "#2b2b2b",
          secondary: "#284b63",
          tertiary: "#84a59d",
          highlight: "rgba(143, 159, 169, 0.15)",
          textHighlight: "#fff23688",
        },
        darkMode: {
          light: "#161618",
          lightgray: "#393639",
          gray: "#646464",
          darkgray: "#d4d4d4",
          dark: "#ebebec",
          secondary: "#7b97aa",
          tertiary: "#84a59d",
          highlight: "rgba(143, 159, 169, 0.15)",
          textHighlight: "#b3aa0288",
        },
      },
    },
  },
  plugins: {
    transformers: [
      Plugin.FrontMatter(),
      Plugin.CreatedModifiedDate({
        priority: ["frontmatter", "filesystem"],
      }),
      Plugin.SyntaxHighlighting({
        theme: {
          light: "github-light",
          dark: "github-dark",
        },
        keepBackground: false,
      }),
      Plugin.ObsidianFlavoredMarkdown(),
      Plugin.GitHubFlavoredMarkdown(),
      Plugin.TableOfContents(),
      Plugin.CrawlLinks({ markdownLinkResolution: "shortest" }),
      Plugin.Description(),
    ],
    filters: [Plugin.RemoveDrafts()],
    emitters: [
      Plugin.AliasRedirects(),
      Plugin.ComponentResources(),
      Plugin.ContentPage(),
      Plugin.FolderPage(),
      Plugin.TagPage(),
      Plugin.ContentIndex({
        enableSiteMap: true,
        enableRSS: false,
      }),
      Plugin.Assets(),
      Plugin.Static(),
      Plugin.Favicon(),
      Plugin.NotFoundPage(),
    ],
  },
}

export default config
```

Key settings:
- `baseUrl: ""` — empty for local serving (no absolute URLs)
- `ignorePatterns` includes `code` and `queries` to exclude them
- `defaultDateType: "created"` — use frontmatter `created` field
- No analytics, no custom OG images (faster builds)
- `CrawlLinks` with `shortest` strategy for wikilink resolution

- [ ] **Step 2: Write `quartz.layout.ts`**

Replace `quartz/quartz.layout.ts` entirely:

```typescript
import { PageLayout, SharedLayout } from "./quartz/cfg"
import * as Component from "./quartz/components"

export const sharedPageComponents: SharedLayout = {
  head: Component.Head(),
  header: [],
  afterBody: [],
  footer: Component.Footer({
    links: {},
  }),
}

export const defaultContentPageLayout: PageLayout = {
  beforeBody: [
    Component.ConditionalRender({
      component: Component.Breadcrumbs(),
      condition: (page) => page.fileData.slug !== "index",
    }),
    Component.ArticleTitle(),
    Component.ContentMeta(),
    Component.TagList(),
  ],
  left: [
    Component.PageTitle(),
    Component.MobileOnly(Component.Spacer()),
    Component.Flex({
      components: [
        {
          Component: Component.Search(),
          grow: true,
        },
        { Component: Component.Darkmode() },
        { Component: Component.ReaderMode() },
      ],
    }),
    Component.Explorer(),
  ],
  right: [
    Component.Graph(),
    Component.DesktopOnly(Component.TableOfContents()),
    Component.Backlinks(),
  ],
}

export const defaultListPageLayout: PageLayout = {
  beforeBody: [
    Component.Breadcrumbs(),
    Component.ArticleTitle(),
    Component.ContentMeta(),
  ],
  left: [
    Component.PageTitle(),
    Component.MobileOnly(Component.Spacer()),
    Component.Flex({
      components: [
        {
          Component: Component.Search(),
          grow: true,
        },
        { Component: Component.Darkmode() },
      ],
    }),
    Component.Explorer(),
  ],
  right: [],
}
```

This is the default Quartz layout with all features: search, dark mode, explorer, graph, table of contents, backlinks, breadcrumbs, tags.

- [ ] **Step 3: Test build with sample content**

```bash
# Create a minimal test page
mkdir -p quartz/content
cat > quartz/content/test.md << 'EOF'
---
title: Test Page
created: 2026-05-27
type: concept
tags: [test]
---

This is a test page with a [[wikilink]].
EOF

cd quartz && npx quartz build 2>&1 | tail -5
cd ..
```

Expected: Build succeeds, output in `quartz/public/`.

- [ ] **Step 4: Clean up test content**

```bash
rm -rf quartz/content/*
```

- [ ] **Step 5: Commit**

```bash
git add quartz.config.ts quartz.layout.ts
git commit -m "feat: configure quartz for llm-wiki with all features"
```

Note: `quartz.config.ts` and `quartz.layout.ts` are the files we'll override inside `quartz/`. We track them in a `quartz-overrides/` directory or copy them in `build.sh`. For simplicity, we'll keep them directly in `quartz/` and note this in the README.

Actually, since `quartz/` is gitignored, we need to track our overrides separately. Let me revise:

- [ ] **Step 5 (revised): Save overrides and commit**

```bash
mkdir -p overrides
cp quartz/quartz.config.ts overrides/quartz.config.ts
cp quartz/quartz.layout.ts overrides/quartz.layout.ts
git add overrides/
git commit -m "feat: quartz config and layout overrides for llm-wiki"
```

---

### Task 3: Build Script

**Files:**
- Create: `build.sh`

- [ ] **Step 1: Create `build.sh`**

```bash
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

# Copy our config overrides into quartz/
cp overrides/quartz.config.ts quartz/quartz.config.ts
cp overrides/quartz.layout.ts quartz/quartz.layout.ts

echo "=== Building Quartz ==="
cd quartz && npx quartz build

echo "=== Build complete ==="
```

- [ ] **Step 2: Make it executable**

```bash
chmod +x build.sh
```

- [ ] **Step 3: Test the build**

```bash
./build.sh
```

Expected: rsync copies files, Quartz builds successfully, output in `quartz/public/`.

- [ ] **Step 4: Verify content structure**

```bash
ls quartz/public/entities/ 2>/dev/null && echo "Entities OK"
ls quartz/public/concepts/ 2>/dev/null && echo "Concepts OK"
```

Expected: HTML files generated for entities and concepts.

- [ ] **Step 5: Commit**

```bash
git add build.sh
git commit -m "feat: build script to sync wiki content and build quartz"
```

---

### Task 4: Express Server

**Files:**
- Create: `server.js`

- [ ] **Step 1: Create `server.js`**

```javascript
const express = require("express");
const { execFile } = require("child_process");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 49345;
const HOST = process.env.HOST || "0.0.0.0";
const STATE_FILE = path.join(__dirname, "sync-state.json");
const WIKI_DIR = path.join(__dirname, "..", "llm-wiki");
const PUBLIC_DIR = path.join(__dirname, "quartz", "public");

let syncLock = false;

// Compute content hash from wiki file mtimes
function computeContentHash() {
  const hash = crypto.createHash("md5");
  const walk = (dir) => {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name === "code" || entry.name === "queries" || entry.name === ".git" || entry.name === "node_modules") continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full);
        } else if (entry.name.endsWith(".md") || entry.name.endsWith(".jpg") || entry.name.endsWith(".jpeg") || entry.name.endsWith(".png")) {
          const stat = fs.statSync(full);
          hash.update(`${full}:${stat.mtimeMs}`);
        }
      }
    } catch (e) {
      // ignore read errors
    }
  };
  walk(WIKI_DIR);
  return hash.digest("hex");
}

// Read sync state from disk
function readState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
  } catch {
    return { lastSyncTime: null, duration: null, success: null, contentHash: null };
  }
}

// Write sync state to disk
function writeState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// GET /api/status
app.get("/api/status", (req, res) => {
  const state = readState();
  const currentHash = computeContentHash();
  res.json({
    ...state,
    currentContentHash: currentHash,
    needsSync: state.contentHash !== currentHash,
  });
});

// POST /api/sync
app.post("/api/sync", (req, res) => {
  if (syncLock) {
    return res.status(429).json({ success: false, error: "Sync already in progress" });
  }

  syncLock = true;
  const startTime = Date.now();

  execFile("bash", [path.join(__dirname, "build.sh")], { cwd: __dirname }, (error, stdout, stderr) => {
    const duration = (Date.now() - startTime) / 1000;
    syncLock = false;

    if (error) {
      const state = {
        lastSyncTime: new Date().toISOString(),
        duration,
        success: false,
        contentHash: null,
        error: stderr || error.message,
      };
      writeState(state);
      return res.json(state);
    }

    const contentHash = computeContentHash();
    const state = {
      lastSyncTime: new Date().toISOString(),
      duration,
      success: true,
      contentHash,
    };
    writeState(state);
    res.json(state);
  });
});

// Serve Quartz static files
app.use(express.static(PUBLIC_DIR));

// Fallback to index.html for SPA routing
app.get("*", (req, res) => {
  const filePath = path.join(PUBLIC_DIR, req.path);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    return res.sendFile(filePath);
  }
  // Try with .html extension
  const htmlPath = filePath + ".html";
  if (fs.existsSync(htmlPath)) {
    return res.sendFile(htmlPath);
  }
  // Try index.html in directory
  const indexPath = path.join(filePath, "index.html");
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  res.status(404).sendFile(path.join(PUBLIC_DIR, "404.html"));
});

app.listen(PORT, HOST, () => {
  console.log(`LLM Wiki server running at http://${HOST}:${PORT}`);
});
```

- [ ] **Step 2: Test server starts**

```bash
# Make sure we've built first
./build.sh

# Start server in background, test, then kill
node server.js &
SERVER_PID=$!
sleep 2

# Test status endpoint
curl -s http://localhost:49345/api/status | head -1

# Test static serving
curl -s -o /dev/null -w "%{http_code}" http://localhost:49345/

kill $SERVER_PID 2>/dev/null
```

Expected: `/api/status` returns JSON with `needsSync`, static page returns 200.

- [ ] **Step 3: Commit**

```bash
git add server.js
git commit -m "feat: express server with sync API and static serving"
```

---

### Task 5: Sync Bar Quartz Component

**Files:**
- Create: `overrides/components/SyncBar.tsx`
- Create: `overrides/components/styles/syncbar.scss`
- Modify: `overrides/quartz.layout.ts`

- [ ] **Step 1: Create `overrides/components/` directory**

```bash
mkdir -p overrides/components/styles
```

- [ ] **Step 2: Create `overrides/components/SyncBar.tsx`**

```tsx
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "../../quartz/components/types"

export default (() => {
  const SyncBar: QuartzComponent = (_props: QuartzComponentProps) => {
    return (
      <div id="sync-bar" class="sync-bar">
        <span class="sync-status" id="sync-status">
          Checking sync status...
        </span>
        <button class="sync-button" id="sync-button" disabled>
          Sync
        </button>
      </div>
    )
  }

  SyncBar.css = `
    .sync-bar {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 16px;
      background: var(--lightgray);
      border-top: 1px solid var(--gray);
      z-index: 100;
      font-size: 0.85rem;
    }
    .sync-status {
      color: var(--darkgray);
    }
    .sync-button {
      padding: 4px 16px;
      border: 1px solid var(--secondary);
      background: var(--secondary);
      color: white;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.85rem;
    }
    .sync-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .sync-button:hover:not(:disabled) {
      opacity: 0.85;
    }
    .sync-toast {
      position: fixed;
      bottom: 50px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--dark);
      color: var(--light);
      padding: 12px 20px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 12px;
      z-index: 101;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    .sync-toast button {
      padding: 4px 12px;
      border: 1px solid var(--tertiary);
      background: var(--tertiary);
      color: white;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.8rem;
    }
    .sync-toast .toast-close {
      background: none;
      border: none;
      color: var(--lightgray);
      cursor: pointer;
      font-size: 1.1rem;
      padding: 0 4px;
    }
    body {
      padding-bottom: 40px;
    }
  `

  SyncBar.afterDOMLoaded = `
    (function() {
      const statusEl = document.getElementById("sync-status");
      const buttonEl = document.getElementById("sync-button");
      if (!statusEl || !buttonEl) return;

      function timeAgo(isoString) {
        if (!isoString) return "never";
        const seconds = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
        if (seconds < 60) return seconds + "s ago";
        if (seconds < 3600) return Math.floor(seconds / 60) + "min ago";
        if (seconds < 86400) return Math.floor(seconds / 3600) + "h ago";
        return Math.floor(seconds / 86400) + "d ago";
      }

      function updateStatus() {
        fetch("/api/status")
          .then(r => r.json())
          .then(data => {
            if (data.lastSyncTime) {
              const successText = data.success ? "✓" : "✗";
              statusEl.textContent = successText + " Last synced: " + timeAgo(data.lastSyncTime);
            } else {
              statusEl.textContent = "Not synced yet";
            }
            buttonEl.disabled = false;

            if (data.needsSync && !document.getElementById("sync-toast")) {
              showStaleToast();
            }
          })
          .catch(() => {
            statusEl.textContent = "Cannot reach server";
            buttonEl.disabled = true;
          });
      }

      function showStaleToast() {
        const toast = document.createElement("div");
        toast.className = "sync-toast";
        toast.id = "sync-toast";
        toast.innerHTML = \`
          <span>Wiki content has changed since last sync.</span>
          <button onclick="doSync()">Sync now</button>
          <button class="toast-close" onclick="this.parentElement.remove()">✕</button>
        \`;
        document.body.appendChild(toast);
      }

      window.doSync = function() {
        const toast = document.getElementById("sync-toast");
        if (toast) toast.remove();

        statusEl.textContent = "Syncing...";
        buttonEl.disabled = true;
        buttonEl.textContent = "Syncing...";

        fetch("/api/sync", { method: "POST" })
          .then(r => r.json())
          .then(data => {
            buttonEl.textContent = "Sync";
            updateStatus();
            if (data.success) {
              window.location.reload();
            }
          })
          .catch(() => {
            statusEl.textContent = "Sync failed";
            buttonEl.disabled = false;
            buttonEl.textContent = "Sync";
          });
      };

      buttonEl.addEventListener("click", doSync);
      updateStatus();
      setInterval(updateStatus, 30000);
    })();
  `

  return SyncBar
}) satisfies QuartzComponentConstructor
```

- [ ] **Step 3: Update `overrides/quartz.layout.ts` to include SyncBar**

Replace `overrides/quartz.layout.ts` with:

```typescript
import { PageLayout, SharedLayout } from "./quartz/cfg"
import * as Component from "./quartz/components"
import SyncBar from "./quartz/components/SyncBar"

export const sharedPageComponents: SharedLayout = {
  head: Component.Head(),
  header: [],
  afterBody: [SyncBar()],
  footer: Component.Footer({
    links: {},
  }),
}

export const defaultContentPageLayout: PageLayout = {
  beforeBody: [
    Component.ConditionalRender({
      component: Component.Breadcrumbs(),
      condition: (page) => page.fileData.slug !== "index",
    }),
    Component.ArticleTitle(),
    Component.ContentMeta(),
    Component.TagList(),
  ],
  left: [
    Component.PageTitle(),
    Component.MobileOnly(Component.Spacer()),
    Component.Flex({
      components: [
        {
          Component: Component.Search(),
          grow: true,
        },
        { Component: Component.Darkmode() },
        { Component: Component.ReaderMode() },
      ],
    }),
    Component.Explorer(),
  ],
  right: [
    Component.Graph(),
    Component.DesktopOnly(Component.TableOfContents()),
    Component.Backlinks(),
  ],
}

export const defaultListPageLayout: PageLayout = {
  beforeBody: [
    Component.Breadcrumbs(),
    Component.ArticleTitle(),
    Component.ContentMeta(),
  ],
  left: [
    Component.PageTitle(),
    Component.MobileOnly(Component.Spacer()),
    Component.Flex({
      components: [
        {
          Component: Component.Search(),
          grow: true,
        },
        { Component: Component.Darkmode() },
      ],
    }),
    Component.Explorer(),
  ],
  right: [],
}
```

- [ ] **Step 4: Update `build.sh` to copy sync bar component**

Add after the `cp overrides/quartz.layout.ts` line:

```bash
# Copy custom components
mkdir -p quartz/quartz/components
cp -r overrides/components/* quartz/quartz/components/
```

- [ ] **Step 5: Test build with sync bar**

```bash
./build.sh
```

Expected: Build succeeds. Check that `quartz/public/index.html` contains `sync-bar` div.

```bash
grep -l "sync-bar" quartz/public/index.html
```

Expected: Match found.

- [ ] **Step 6: Commit**

```bash
git add overrides/components/ overrides/quartz.layout.ts build.sh
git commit -m "feat: sync bar component with status display and trigger button"
```

---

### Task 6: Type Badge Component

**Files:**
- Create: `overrides/components/TypeBadge.tsx`
- Modify: `overrides/quartz.layout.ts`

- [ ] **Step 1: Create `overrides/components/TypeBadge.tsx`**

```tsx
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "../../quartz/components/types"

export default (() => {
  const TypeBadge: QuartzComponent = ({ fileData }: QuartzComponentProps) => {
    const type = fileData.frontmatter?.type as string | undefined
    if (!type) return null

    const label = type.charAt(0).toUpperCase() + type.slice(1)

    return (
      <span class="type-badge">
        {label}
      </span>
    )
  }

  TypeBadge.css = `
    .type-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      background: var(--highlight);
      color: var(--secondary);
      margin-bottom: 0.5rem;
    }
  `

  return TypeBadge
}) satisfies QuartzComponentConstructor
```

- [ ] **Step 2: Add TypeBadge to layout**

In `overrides/quartz.layout.ts`, add the import and insert TypeBadge after `Component.Breadcrumbs()` in `defaultContentPageLayout.beforeBody`:

```typescript
import TypeBadge from "./quartz/components/TypeBadge"
```

In `defaultContentPageLayout.beforeBody`, add after Breadcrumbs:

```typescript
    Component.ConditionalRender({
      component: Component.Breadcrumbs(),
      condition: (page) => page.fileData.slug !== "index",
    }),
    TypeBadge(),
    Component.ArticleTitle(),
```

- [ ] **Step 3: Test build**

```bash
./build.sh
# Check that type badge appears in a page that has type: concept
grep -l "type-badge" quartz/public/concepts/*.html 2>/dev/null | head -1
```

Expected: At least one concept page contains the type badge HTML.

- [ ] **Step 4: Commit**

```bash
git add overrides/components/TypeBadge.tsx overrides/quartz.layout.ts
git commit -m "feat: type badge component showing content category from frontmatter"
```

---

### Task 7: Wiki Index Page

**Files:**
- Create: `overrides/index.md`

- [ ] **Step 1: Create `overrides/index.md`**

```markdown
---
title: LLM Wiki
enableToc: false
---

Welcome to the LLM Wiki — a personal knowledge base covering AI coding agents, enterprise systems, edge AI hardware, and technical deep dives.

## Browse by Category

- **[[entities|Entities]]** — Products, tools, and systems (OpenCode, CC-Connect, Warp Terminal, etc.)
- **[[concepts|Concepts]]** — Architectures, workflows, and patterns (RTK, EvoDev, MoveIt2, etc.)
- **[[comparisons|Comparisons]]** — Side-by-side analyses
- **[[study|Study]]** — Learning materials and walkthroughs
- **[[raw/articles|Articles]]** — Source articles and references

## How to Use

- Use **Search** (top left) to find any page
- Click **Graph** to visualize connections between pages
- Check **Backlinks** on each page to see what links to it
- Browse by **Tags** for topic-based navigation
- Use the **Sync** button at the bottom to update the site when wiki content changes
```

- [ ] **Step 2: Update `build.sh` to copy index page**

Add after the `rm -f` lines and before the quartz config copy:

```bash
# Copy custom index page (overrides wiki's index.md)
cp overrides/index.md "$QUARTZ_CONTENT/index.md"
```

- [ ] **Step 3: Build and verify**

```bash
./build.sh
cat quartz/public/index.html | grep "LLM Wiki"
```

Expected: "LLM Wiki" title appears in the generated index.

- [ ] **Step 4: Commit**

```bash
git add overrides/index.md build.sh
git commit -m "feat: custom index page with category navigation"
```

---

### Task 8: Integration Test

- [ ] **Step 1: Full build from scratch**

```bash
rm -rf quartz/public
./build.sh
```

Expected: Build completes without errors.

- [ ] **Step 2: Verify all content types exist**

```bash
echo "=== Entities ==="
ls quartz/public/entities/ | head -5
echo "=== Concepts ==="
ls quartz/public/concepts/ | head -5
echo "=== Comparisons ==="
ls quartz/public/comparisons/ | head -5
echo "=== Study ==="
ls quartz/public/study/ | head -5
echo "=== Raw/Articles ==="
ls quartz/public/raw/articles/ | head -5
```

Expected: HTML files for each category.

- [ ] **Step 3: Verify wikilinks resolved**

```bash
# Check that internal links use actual paths, not [[wikilinks]]
grep -c 'href="/' quartz/public/entities/opencode.html
```

Expected: Count > 0 (internal links resolved).

- [ ] **Step 4: Verify sync bar present**

```bash
grep -c "sync-bar" quartz/public/index.html
```

Expected: Count > 0.

- [ ] **Step 5: Verify search index generated**

```bash
ls quartz/public/static/contentIndex.json
```

Expected: File exists.

- [ ] **Step 6: Verify tags pages**

```bash
ls quartz/public/tags/ | head -5
```

Expected: Tag pages exist.

- [ ] **Step 7: Start server and test API**

```bash
node server.js &
SERVER_PID=$!
sleep 2

echo "=== Status ==="
curl -s http://localhost:49345/api/status | python3 -m json.tool

echo "=== Homepage ==="
curl -s -o /dev/null -w "HTTP %{http_code}" http://localhost:49345/

kill $SERVER_PID 2>/dev/null
```

Expected: Status returns JSON, homepage returns 200.

- [ ] **Step 8: Commit final state**

```bash
git add -A
git commit -m "chore: integration test passed, llm-wiki-site ready"
```

---

### File Summary

| File | Purpose |
|------|---------|
| `package.json` | Express dependency |
| `.gitignore` | Ignore node_modules, quartz/, sync-state.json |
| `build.sh` | Syncs wiki content → Quartz, builds static site |
| `server.js` | Express: static serving + `/api/sync` + `/api/status` |
| `overrides/quartz.config.ts` | Quartz config (title, ignorePatterns, plugins) |
| `overrides/quartz.layout.ts` | Layout with all features + SyncBar + TypeBadge |
| `overrides/components/SyncBar.tsx` | Sync bar UI + client-side JS |
| `overrides/components/TypeBadge.tsx` | Content type badge from frontmatter |
| `overrides/index.md` | Custom homepage with category navigation |

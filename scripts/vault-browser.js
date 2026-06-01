const fs = require("fs")
const path = require("path")
const { shouldExcludePath } = require("./sync-excludes")

const TEXT_EXTENSIONS = new Set([
  ".c",
  ".cfg",
  ".conf",
  ".cpp",
  ".css",
  ".csv",
  ".h",
  ".html",
  ".ini",
  ".js",
  ".json",
  ".jsx",
  ".lock",
  ".log",
  ".md",
  ".mdx",
  ".py",
  ".rs",
  ".sh",
  ".toml",
  ".ts",
  ".tsx",
  ".txt",
  ".yaml",
  ".yml",
])

const IMAGE_EXTENSIONS = new Set([".gif", ".jpg", ".jpeg", ".png", ".svg", ".webp"])

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function toVaultPath(...parts) {
  return parts
    .join("/")
    .split(/[\\/]+/)
    .filter(Boolean)
    .join("/")
}

function encodeVaultPath(relativePath) {
  return toVaultPath(relativePath)
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/")
}

function hrefForVaultPath(relativePath = "", isDirectory = false, prefix = "/vault") {
  const base = prefix.replace(/\/+$/, "")
  const encoded = encodeVaultPath(relativePath)
  if (!encoded) return `${base}/`
  return `${base}/${encoded}${isDirectory ? "/" : ""}`
}

function isWithin(root, candidate) {
  const relative = path.relative(root, candidate)
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative))
}

function resolveVaultPath(vaultRoot, requestedPath = "") {
  const root = path.resolve(vaultRoot)
  const realRoot = fs.realpathSync(root)
  const normalized = toVaultPath(requestedPath)
  const absolute = path.resolve(root, normalized)

  if (!isWithin(root, absolute)) {
    throw new Error("Path is outside vault root")
  }

  let realAbsolute
  try {
    realAbsolute = fs.realpathSync(absolute)
  } catch {
    realAbsolute = fs.realpathSync(path.dirname(absolute))
    if (!isWithin(realRoot, realAbsolute)) {
      throw new Error("Path is outside vault root")
    }
    realAbsolute = absolute
  }

  if (!isWithin(realRoot, realAbsolute)) {
    throw new Error("Path is outside vault root")
  }

  const relative = path.relative(root, absolute)
  if (shouldExcludePath(relative)) {
    throw new Error("Path is an excluded vault path")
  }

  const realRelative = path.relative(realRoot, realAbsolute)
  if (shouldExcludePath(realRelative)) {
    throw new Error("Path is an excluded vault path")
  }

  return { absolute, relative: toVaultPath(relative) }
}

function classifyEntry(vaultRoot, directoryAbsolute, directoryRelative, dirent) {
  const root = path.resolve(vaultRoot)
  const realRoot = fs.realpathSync(root)
  const absolute = path.join(directoryAbsolute, dirent.name)
  const entryRelative = toVaultPath(directoryRelative, dirent.name)
  const isSymlink = dirent.isSymbolicLink()
  if (isSymlink) {
    const resolved = fs.realpathSync(absolute)
    if (!isWithin(realRoot, resolved)) {
      return null
    }
    if (shouldExcludePath(path.relative(realRoot, resolved))) {
      return null
    }
  }
  const stat = fs.statSync(absolute)
  const kind = stat.isDirectory() ? "directory" : "file"

  return {
    name: dirent.name,
    path: entryRelative,
    href: hrefForVaultPath(entryRelative, kind === "directory"),
    kind,
    isSymlink,
    size: stat.size,
    mtimeMs: stat.mtimeMs,
  }
}

function listVaultDirectory(vaultRoot, requestedPath = "") {
  const { absolute, relative } = resolveVaultPath(vaultRoot, requestedPath)
  const entries = fs.readdirSync(absolute, { withFileTypes: true })

  return entries
    .filter((entry) => !shouldExcludePath(toVaultPath(relative, entry.name)))
    .map((entry) => {
      try {
        return classifyEntry(vaultRoot, absolute, relative, entry)
      } catch {
        return null
      }
    })
    .filter(Boolean)
    .sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === "directory" ? -1 : 1
      return a.name.localeCompare(b.name)
    })
}

function formatSize(size) {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

function renderShell(title, body) {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>
    body { margin: 0; font: 14px/1.5 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #1f2933; background: #f8fafc; }
    header { display: flex; gap: 16px; align-items: center; padding: 12px 18px; background: #111827; color: white; }
    header a { color: #d1e9ff; text-decoration: none; }
    main { max-width: 1180px; margin: 0 auto; padding: 20px 18px 40px; }
    h1 { font-size: 22px; margin: 0 0 14px; overflow-wrap: anywhere; }
    .crumbs { margin-bottom: 14px; color: #52616f; }
    .crumbs a { color: #2563eb; text-decoration: none; }
    table { width: 100%; border-collapse: collapse; background: white; border: 1px solid #e5e7eb; }
    th, td { padding: 8px 10px; border-bottom: 1px solid #edf2f7; text-align: left; vertical-align: top; }
    th { font-size: 12px; color: #52616f; background: #f1f5f9; }
    td.name { width: 62%; overflow-wrap: anywhere; }
    td.meta { color: #64748b; white-space: nowrap; }
    a { color: #0f62fe; }
    .badge { display: inline-block; margin-left: 6px; padding: 1px 5px; border: 1px solid #cbd5e1; border-radius: 4px; color: #475569; font-size: 12px; }
    pre { margin: 0; padding: 16px; overflow: auto; background: white; border: 1px solid #e5e7eb; white-space: pre-wrap; overflow-wrap: anywhere; }
    img { max-width: 100%; height: auto; background: white; border: 1px solid #e5e7eb; }
    .notice { padding: 12px 14px; background: #fff7ed; border: 1px solid #fed7aa; color: #7c2d12; }
  </style>
</head>
<body>
  <header><strong>Vault Browser</strong><a href="/">Quartz Wiki</a><a href="/vault/">Vault Root</a></header>
  <main>${body}</main>
</body>
</html>`
}

function renderBreadcrumbs(relativePath) {
  const parts = toVaultPath(relativePath).split("/").filter(Boolean)
  const links = ['<a href="/vault/">vault</a>']
  let current = ""
  for (const part of parts) {
    current = toVaultPath(current, part)
    links.push(`<a href="${hrefForVaultPath(current, true)}">${escapeHtml(part)}</a>`)
  }
  return `<div class="crumbs">${links.join(" / ")}</div>`
}

function renderVaultDirectory(relativePath, entries) {
  const normalized = toVaultPath(relativePath)
  const parentPath = normalized ? path.posix.dirname(normalized) : ""
  const parentHref = parentPath === "." ? "" : parentPath
  const parentUrl = parentHref ? hrefForVaultPath(parentHref, true) : "/vault/"
  const parentRow = normalized
    ? `<tr><td class="name"><a href="${parentUrl}">..</a></td><td class="meta">directory</td><td class="meta"></td></tr>`
    : ""
  const rows = entries
    .map((entry) => {
      const label = `${entry.kind === "directory" ? "/" : ""}${escapeHtml(entry.name)}`
      const symlink = entry.isSymlink ? '<span class="badge">symlink</span>' : ""
      return `<tr><td class="name"><a href="${entry.href}">${label}</a>${symlink}</td><td class="meta">${entry.kind}</td><td class="meta">${entry.kind === "file" ? formatSize(entry.size) : ""}</td></tr>`
    })
    .join("\n")

  return renderShell(
    normalized || "vault",
    `${renderBreadcrumbs(normalized)}<h1>${escapeHtml(normalized || "/")}</h1><table><thead><tr><th>Name</th><th>Type</th><th>Size</th></tr></thead><tbody>${parentRow}${rows}</tbody></table>`,
  )
}

function renderVaultFile(relativePath, contents) {
  const normalized = toVaultPath(relativePath)
  return renderShell(
    normalized,
    `${renderBreadcrumbs(path.posix.dirname(normalized))}<h1>${escapeHtml(path.posix.basename(normalized))}</h1><pre>${escapeHtml(contents)}</pre>`,
  )
}

function renderVaultBinary(relativePath, stat) {
  const normalized = toVaultPath(relativePath)
  const ext = path.extname(normalized).toLowerCase()
  const rawHref = hrefForVaultPath(normalized, false, "/vault-raw")
  const preview = IMAGE_EXTENSIONS.has(ext)
    ? `<img src="${rawHref}" alt="${escapeHtml(path.posix.basename(normalized))}">`
    : `<div class="notice">Binary file. Use the raw link to open or download it.</div>`
  return renderShell(
    normalized,
    `${renderBreadcrumbs(path.posix.dirname(normalized))}<h1>${escapeHtml(path.posix.basename(normalized))}</h1><p><a href="${rawHref}">Open raw</a> · ${formatSize(stat.size)}</p>${preview}`,
  )
}

function isTextFile(filePath) {
  return TEXT_EXTENSIONS.has(path.extname(filePath).toLowerCase())
}

module.exports = {
  IMAGE_EXTENSIONS,
  TEXT_EXTENSIONS,
  hrefForVaultPath,
  isTextFile,
  listVaultDirectory,
  renderVaultBinary,
  renderVaultDirectory,
  renderVaultFile,
  resolveVaultPath,
}

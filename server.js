const express = require("express")
const { execFile } = require("child_process")
const fs = require("fs")
const path = require("path")
const crypto = require("crypto")
const { shouldBlockPublicPath, shouldExcludePath } = require("./scripts/sync-excludes")
const { resolveStaticFallback } = require("./scripts/static-fallback")
const { resolvePublicDir, resolveVaultDir } = require("./scripts/config")
const {
  isTextFile,
  listVaultDirectory,
  renderVaultBinary,
  renderVaultDirectory,
  renderVaultFile,
  resolveVaultPath,
} = require("./scripts/vault-browser")

const app = express()
const PORT = process.env.PORT || 49345
const HOST = process.env.HOST || "0.0.0.0"
const APP_ROOT = __dirname
const STATE_FILE = path.join(APP_ROOT, "sync-state.json")
const VAULT_DIR = resolveVaultDir(APP_ROOT)
const PUBLIC_DIR = resolvePublicDir(APP_ROOT)

let syncLock = false

function computeContentHash() {
  const hash = crypto.createHash("md5")
  const walk = (dir) => {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true })
      for (const entry of entries) {
        const full = path.join(dir, entry.name)
        const relative = path.relative(VAULT_DIR, full)
        if (shouldExcludePath(relative)) continue
        if (entry.isDirectory()) {
          walk(full)
        } else if (/\.(md|jpg|jpeg|png|yaml|yml|jsonl)$/i.test(entry.name)) {
          const stat = fs.statSync(full)
          hash.update(`${relative}:${stat.mtimeMs}`)
        }
      }
    } catch {}
  }
  walk(VAULT_DIR)
  return hash.digest("hex")
}

function readState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"))
  } catch {
    return { lastSyncTime: null, duration: null, success: null, contentHash: null }
  }
}

function writeState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2))
}

app.get("/api/status", (req, res) => {
  const state = readState()
  const currentHash = computeContentHash()
  res.json({
    lastSyncTime: state.lastSyncTime,
    duration: state.duration,
    success: state.success,
    contentHash: state.contentHash,
    error: state.error,
    currentContentHash: currentHash,
    needsSync: state.contentHash !== currentHash,
  })
})

app.post("/api/sync", (req, res) => {
  if (syncLock) {
    return res.status(429).json({ success: false, error: "Sync already in progress" })
  }
  syncLock = true
  const startTime = Date.now()

  execFile("bash", [path.join(APP_ROOT, "build.sh")], { cwd: APP_ROOT }, (error, stdout, stderr) => {
    const duration = (Date.now() - startTime) / 1000
    syncLock = false

    if (error) {
      const state = {
        lastSyncTime: new Date().toISOString(),
        duration,
        success: false,
        contentHash: null,
        error: stderr || error.message,
      }
      writeState(state)
      return res.status(500).json(state)
    }

    const contentHash = computeContentHash()
    const state = {
      lastSyncTime: new Date().toISOString(),
      duration,
      success: true,
      contentHash,
    }
    writeState(state)
    res.json(state)
  })
})

function sendVaultError(res, status, message) {
  res.status(status).send(`<pre>${message}</pre>`)
}

app.get(/^\/vault\/?(.*)$/, (req, res) => {
  const requestedPath = req.params[0] || ""
  let resolved

  try {
    resolved = resolveVaultPath(VAULT_DIR, requestedPath)
  } catch (error) {
    return sendVaultError(res, 404, error.message)
  }

  let stat
  try {
    stat = fs.statSync(resolved.absolute)
  } catch {
    return sendVaultError(res, 404, "Vault path not found")
  }

  if (stat.isDirectory()) {
    const entries = listVaultDirectory(VAULT_DIR, resolved.relative)
    return res.send(renderVaultDirectory(resolved.relative, entries))
  }

  if (isTextFile(resolved.absolute)) {
    const contents = fs.readFileSync(resolved.absolute, "utf8")
    return res.send(renderVaultFile(resolved.relative, contents))
  }

  res.send(renderVaultBinary(resolved.relative, stat))
})

app.get(/^\/vault-raw\/(.+)$/, (req, res) => {
  const requestedPath = req.params[0] || ""
  let resolved

  try {
    resolved = resolveVaultPath(VAULT_DIR, requestedPath)
  } catch (error) {
    return sendVaultError(res, 404, error.message)
  }

  res.sendFile(resolved.absolute)
})

app.use((req, res, next) => {
  if (shouldBlockPublicPath(req.path)) {
    return sendVaultError(res, 404, "Path is outside published wiki layers")
  }
  next()
})

app.use(express.static(PUBLIC_DIR))

app.get("*", (req, res) => {
  let resolved
  try {
    resolved = resolveStaticFallback(PUBLIC_DIR, req.path)
  } catch {
    resolved = null
  }

  if (resolved) {
    return res.status(resolved.status).sendFile(resolved.filePath)
  }

  res.status(404).send("Not Found")
})

app.listen(PORT, HOST, () => {
  console.log(`Knowledge vault wiki running at http://${HOST}:${PORT}`)
  console.log(`VAULT_DIR=${VAULT_DIR}`)
})

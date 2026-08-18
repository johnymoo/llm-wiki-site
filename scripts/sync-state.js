const fs = require("fs")
const path = require("path")
const crypto = require("crypto")
const { shouldExcludePath } = require("./sync-excludes")

function computeContentHash(vaultDir) {
  const hash = crypto.createHash("md5")
  const walk = (dir) => {
    try {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name)
        const relative = path.relative(vaultDir, full)
        if (shouldExcludePath(relative)) continue
        if (entry.isDirectory()) {
          walk(full)
        } else if (/\.(md|jpg|jpeg|png|yaml|yml|jsonl)$/i.test(entry.name)) {
          hash.update(`${relative}:${fs.statSync(full).mtimeMs}`)
        }
      }
    } catch {}
  }
  walk(vaultDir)
  return hash.digest("hex")
}

function resolveStateFile(appRoot) {
  return process.env.SYNC_STATE_FILE || path.join(appRoot, "sync-state.json")
}

function readState(stateFile) {
  try {
    return JSON.parse(fs.readFileSync(stateFile, "utf-8"))
  } catch {
    return { lastSyncTime: null, duration: null, success: null, contentHash: null }
  }
}

function writeState(stateFile, state) {
  fs.mkdirSync(path.dirname(stateFile), { recursive: true })
  fs.writeFileSync(stateFile, JSON.stringify(state, null, 2))
}

module.exports = {
  computeContentHash,
  readState,
  resolveStateFile,
  writeState,
}

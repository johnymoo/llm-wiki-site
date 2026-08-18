const path = require("path")

const { resolveVaultDir } = require("./config")
const { computeContentHash, resolveStateFile, writeState } = require("./sync-state")

const appRoot = path.resolve(__dirname, "..")
const duration = Number(process.env.SYNC_DURATION_SECONDS || 0)
const vaultDir = resolveVaultDir(appRoot)

writeState(resolveStateFile(appRoot), {
  lastSyncTime: new Date().toISOString(),
  duration,
  success: true,
  contentHash: computeContentHash(vaultDir),
})

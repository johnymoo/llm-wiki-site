const assert = require("assert")
const fs = require("fs")
const os = require("os")
const path = require("path")

const { computeContentHash, readState, resolveStateFile, writeState } = require("../scripts/sync-state")

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "llm-wiki-state-"))
const stateFile = path.join(tempDir, "persistent", "sync-state.json")
const previousStateFile = process.env.SYNC_STATE_FILE

process.env.SYNC_STATE_FILE = stateFile
assert.strictEqual(resolveStateFile("/app"), stateFile)
assert.deepStrictEqual(readState(stateFile), {
  lastSyncTime: null,
  duration: null,
  success: null,
  contentHash: null,
})

const state = { lastSyncTime: "2026-08-18T00:00:00.000Z", duration: 1.25, success: true, contentHash: "abc" }
writeState(stateFile, state)
assert.deepStrictEqual(readState(stateFile), state)

const vaultDir = path.join(tempDir, "vault")
fs.mkdirSync(path.join(vaultDir, "10_wiki"), { recursive: true })
fs.writeFileSync(path.join(vaultDir, "10_wiki", "page.md"), "# Published\n")
fs.mkdirSync(path.join(vaultDir, "20_human"), { recursive: true })
fs.writeFileSync(path.join(vaultDir, "20_human", "private.md"), "# Private\n")
const publishedHash = computeContentHash(vaultDir)
fs.writeFileSync(path.join(vaultDir, "20_human", "private.md"), "# Changed\n")
assert.strictEqual(computeContentHash(vaultDir), publishedHash)

if (previousStateFile === undefined) {
  delete process.env.SYNC_STATE_FILE
} else {
  process.env.SYNC_STATE_FILE = previousStateFile
}
fs.rmSync(tempDir, { recursive: true, force: true })

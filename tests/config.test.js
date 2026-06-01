const assert = require("assert")
const path = require("path")

const { resolveVaultDir, resolvePublicDir } = require("../scripts/config")

const appRoot = path.resolve(__dirname, "..")
const previousVaultDir = process.env.VAULT_DIR

delete process.env.VAULT_DIR
assert.strictEqual(resolveVaultDir(appRoot), path.resolve(appRoot, "../llm-knowledge-vault"))

process.env.VAULT_DIR = "/tmp/example-vault"
assert.strictEqual(resolveVaultDir(appRoot), "/tmp/example-vault")

process.env.VAULT_DIR = "relative-vault"
assert.strictEqual(resolveVaultDir(appRoot), path.resolve(appRoot, "relative-vault"))

assert.strictEqual(resolvePublicDir(appRoot), path.join(appRoot, "quartz", "public"))

if (previousVaultDir === undefined) {
  delete process.env.VAULT_DIR
} else {
  process.env.VAULT_DIR = previousVaultDir
}

const assert = require("assert")
const { spawnSync } = require("child_process")
const path = require("path")

const appRoot = path.resolve(__dirname, "..")
const missingVault = ".missing-vault-for-test"
const expectedPath = path.join(appRoot, missingVault)

const result = spawnSync("bash", ["build.sh"], {
  cwd: appRoot,
  env: {
    ...process.env,
    VAULT_DIR: missingVault,
  },
  encoding: "utf8",
})

assert.notStrictEqual(result.status, 0)
assert.match(
  result.stderr,
  new RegExp(`Error: vault directory not found at ${expectedPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`),
)

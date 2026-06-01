const path = require("path")

function resolveVaultDir(appRoot) {
  const configured = process.env.VAULT_DIR || "../llm-knowledge-vault"
  return path.isAbsolute(configured)
    ? configured
    : path.resolve(appRoot, configured)
}

function resolvePublicDir(appRoot) {
  return path.join(appRoot, "quartz", "public")
}

module.exports = {
  resolvePublicDir,
  resolveVaultDir,
}

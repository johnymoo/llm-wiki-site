const assert = require("assert")
const fs = require("fs")
const os = require("os")
const path = require("path")

const {
  hrefForVaultPath,
  listVaultDirectory,
  resolveVaultPath,
  renderVaultDirectory,
  renderVaultFile,
} = require("../scripts/vault-browser")

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "llm-wiki-site-vault-"))
const vaultRoot = path.join(tempDir, "vault")
const externalRoot = path.join(tempDir, "external")

fs.mkdirSync(path.join(vaultRoot, "10_wiki"), { recursive: true })
fs.mkdirSync(path.join(vaultRoot, "10_wiki", "nested"), { recursive: true })
fs.mkdirSync(path.join(vaultRoot, "20_human"), { recursive: true })
fs.mkdirSync(path.join(vaultRoot, ".git"), { recursive: true })
fs.mkdirSync(externalRoot, { recursive: true })
fs.writeFileSync(path.join(vaultRoot, "10_wiki", "page.md"), "# Wiki Page\n")
fs.writeFileSync(path.join(vaultRoot, "10_wiki", "nested", "target.md"), "# Nested Target\n")
fs.writeFileSync(path.join(vaultRoot, "10_wiki", "file#question?.md"), "# Reserved Characters\n")
fs.writeFileSync(path.join(vaultRoot, "20_human", "secret.md"), "# Secret\n")
fs.writeFileSync(path.join(vaultRoot, "manifest.yaml"), "vault_name: private\n")
fs.writeFileSync(path.join(vaultRoot, ".git", "config"), "[core]\n")
fs.writeFileSync(path.join(externalRoot, "raw.md"), "# Raw Page\n")
fs.symlinkSync(externalRoot, path.join(vaultRoot, "00_raw"))
fs.symlinkSync(path.join(vaultRoot, "10_wiki", "nested"), path.join(vaultRoot, "10_wiki", "linked-nested"))
fs.symlinkSync(path.join(vaultRoot, "20_human"), path.join(vaultRoot, "10_wiki", "linked-secret"))

assert.throws(() => resolveVaultPath(vaultRoot, "../outside"), /outside vault root/)
assert.throws(() => resolveVaultPath(vaultRoot, ".git/config"), /excluded vault path/)
assert.throws(() => resolveVaultPath(vaultRoot, "00_raw"), /excluded vault path|outside vault root/)
assert.throws(() => resolveVaultPath(vaultRoot, "00_raw/raw.md"), /excluded vault path|outside vault root/)
assert.throws(() => resolveVaultPath(vaultRoot, "20_human"), /excluded vault path/)
assert.throws(() => resolveVaultPath(vaultRoot, "20_human/secret.md"), /excluded vault path/)
assert.throws(() => resolveVaultPath(vaultRoot, "manifest.yaml"), /excluded vault path/)

const rootEntries = listVaultDirectory(vaultRoot, "")
assert.deepStrictEqual(
  rootEntries.map((entry) => entry.name),
  ["10_wiki"],
)
assert.deepStrictEqual(rootEntries[0].kind, "directory")
assert.deepStrictEqual(rootEntries[0].isSymlink, false)

const directoryHtml = renderVaultDirectory("/", rootEntries)
assert.match(directoryHtml, /href="\/vault\/10_wiki\/"/)
assert.doesNotMatch(directoryHtml, /href="\/vault\/00_raw\/"/)
assert.doesNotMatch(directoryHtml, /\.git/)

const topLevelDirectoryHtml = renderVaultDirectory("00_raw", rootEntries)
assert.match(topLevelDirectoryHtml, /href="\/vault\/">..<\/a>/)

const fileHtml = renderVaultFile("10_wiki/page.md", "# Wiki Page\n")
assert.match(fileHtml, /<pre># Wiki Page\n<\/pre>/)

const wikiEntries = listVaultDirectory(vaultRoot, "10_wiki")
assert(wikiEntries.some((entry) => entry.name === "linked-nested"))
assert(!wikiEntries.some((entry) => entry.name === "linked-secret"))

assert.strictEqual(
  hrefForVaultPath("10_wiki/file#question?.md"),
  "/vault/10_wiki/file%23question%3F.md",
)
assert.strictEqual(
  hrefForVaultPath("10_wiki/nested", true),
  "/vault/10_wiki/nested/",
)
assert.match(
  renderVaultDirectory("10_wiki", wikiEntries),
  /href="\/vault\/10_wiki\/file%23question%3F\.md"/,
)

fs.rmSync(tempDir, { recursive: true, force: true })

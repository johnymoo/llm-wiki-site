const assert = require("assert")
const fs = require("fs")
const os = require("os")
const path = require("path")

const { resolveStaticFallback } = require("../scripts/static-fallback")
const { shouldBlockPublicPath } = require("../scripts/sync-excludes")

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "llm-wiki-static-"))
const publicDir = path.join(tempDir, "public")
const pageDir = path.join(publicDir, "10_wiki", "concepts")
const htmlPath = path.join(pageDir, "concept-example.html")
const tagDir = path.join(publicDir, "tags")
const tagPath = path.join(tagDir, "example.html")

fs.mkdirSync(pageDir, { recursive: true })
fs.mkdirSync(tagDir, { recursive: true })
fs.writeFileSync(htmlPath, "<h1>ok</h1>")
fs.writeFileSync(tagPath, "<h1>tag</h1>")

const resolved = resolveStaticFallback(
  publicDir,
  "/10_wiki/concepts/concept-example",
)

assert.deepStrictEqual(resolved, { filePath: htmlPath, status: 200 })
assert.deepStrictEqual(resolveStaticFallback(publicDir, "/tags/example"), {
  filePath: tagPath,
  status: 200,
})

const privateDir = path.join(publicDir, "20_human")
const privatePath = path.join(privateDir, "secret.html")
fs.mkdirSync(privateDir, { recursive: true })
fs.writeFileSync(privatePath, "<h1>secret</h1>")

assert.strictEqual(resolveStaticFallback(publicDir, "/20_human/secret"), null)
assert.strictEqual(shouldBlockPublicPath("/20_human/secret.html"), true)
assert.strictEqual(shouldBlockPublicPath("/%32%30_human/secret.html"), true)
assert.strictEqual(shouldBlockPublicPath("/10_wiki/../20_human/secret.html"), true)
assert.strictEqual(shouldBlockPublicPath("/10_wiki/concepts/page.html"), false)
assert.strictEqual(shouldBlockPublicPath("/static/contentIndex.json"), false)
assert.strictEqual(shouldBlockPublicPath("/index.css"), false)
assert.strictEqual(shouldBlockPublicPath("/manifest.yaml"), true)
assert.strictEqual(shouldBlockPublicPath("/llms.txt"), true)

const secretPath = path.join(tempDir, "secret.txt")
fs.writeFileSync(secretPath, "do not serve")

assert.strictEqual(resolveStaticFallback(publicDir, "/../secret.txt"), null)
assert.strictEqual(resolveStaticFallback(publicDir, "/%2e%2e/secret.txt"), null)

fs.rmSync(tempDir, { recursive: true, force: true })

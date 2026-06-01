const assert = require("assert")
const fs = require("fs")
const os = require("os")
const path = require("path")

const { normalizeMarkdownTree } = require("../scripts/normalize-frontmatter")
const { rsyncExcludeArgs, shouldExcludePath } = require("../scripts/sync-excludes")

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "llm-wiki-site-"))
const pagePath = path.join(tempDir, "page.md")

fs.writeFileSync(
  pagePath,
  [
    "---",
    "title: Test Page",
    "sources: [[source-a]], [[source-b]], [[source-c]]",
    "tags: [agent, test]",
    "---",
    "",
    "# Test Page",
    "",
  ].join("\n"),
)

normalizeMarkdownTree(tempDir)

const output = fs.readFileSync(pagePath, "utf8")

assert.match(output, /sources:\n  - "\[\[source-a\]\]"\n  - "\[\[source-b\]\]"\n  - "\[\[source-c\]\]"/)
assert.match(output, /tags: \[agent, test\]/)
assert.match(output, /# Test Page/)

const brokenQuotePath = path.join(tempDir, "broken-quote.md")
fs.writeFileSync(
  brokenQuotePath,
  [
    "---",
    "title: \"<PRIVATE_PERSON>",
    "url: \"<PRIVATE_URL>",
    "---",
    "",
    "# Broken Quote",
    "",
  ].join("\n"),
)

normalizeMarkdownTree(tempDir)

const brokenQuoteOutput = fs.readFileSync(brokenQuotePath, "utf8")
assert.match(brokenQuoteOutput, /title: "<PRIVATE_PERSON>"/)
assert.match(brokenQuoteOutput, /url: "<PRIVATE_URL>"/)

const embeddedQuotePath = path.join(tempDir, "embedded-quote.md")
fs.writeFileSync(
  embeddedQuotePath,
  [
    "---",
    'title: "日消耗10亿Tokens，"AI暴动级实干家"的四点心得"',
    'raw_path: "00_raw/wallabagger/OpenClaw 与 Moltbook 硬核拆解_当 Markdown 被"武器化"为可执行代码.md"',
    "---",
    "",
    "# Embedded Quote",
    "",
  ].join("\n"),
)

normalizeMarkdownTree(tempDir)

const embeddedQuoteOutput = fs.readFileSync(embeddedQuotePath, "utf8")
assert.match(embeddedQuoteOutput, /title: '日消耗10亿Tokens，"AI暴动级实干家"的四点心得'/)
assert.match(embeddedQuoteOutput, /raw_path: '00_raw\/wallabagger\/OpenClaw 与 Moltbook 硬核拆解_当 Markdown 被"武器化"为可执行代码\.md'/)

assert.strictEqual(shouldExcludePath("tools/vault-search/.venv/bin/python"), true)
assert.strictEqual(shouldExcludePath("tools/vault-kernel/.pytest_cache/README.md"), true)
assert.strictEqual(shouldExcludePath("tools/vault-search/UNKNOWN.egg-info/PKG-INFO"), true)
assert.strictEqual(shouldExcludePath("00_raw/example.md"), true)
assert.strictEqual(shouldExcludePath("05_capture/inbox.md"), true)
assert.strictEqual(shouldExcludePath("20_human/private.md"), true)
assert.strictEqual(shouldExcludePath("20_self/reflection.md"), true)
assert.strictEqual(shouldExcludePath("manifest.yaml"), true)
assert.strictEqual(shouldExcludePath("10_wiki/concepts/page.md"), false)
assert.strictEqual(shouldExcludePath("30_maps/Home.md"), false)
assert.strictEqual(rsyncExcludeArgs.includes("--no-links"), true)
assert.strictEqual(rsyncExcludeArgs.includes("--exclude=/00_raw/"), true)
assert.strictEqual(rsyncExcludeArgs.includes("--exclude=/20_human/"), true)

fs.rmSync(tempDir, { recursive: true, force: true })

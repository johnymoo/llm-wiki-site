const fs = require("fs")
const path = require("path")

const markdownExtensions = new Set([".md", ".markdown"])

function walkMarkdownFiles(rootDir) {
  const entries = fs.readdirSync(rootDir, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const fullPath = path.join(rootDir, entry.name)
    if (entry.isDirectory()) {
      files.push(...walkMarkdownFiles(fullPath))
    } else if (entry.isFile() && markdownExtensions.has(path.extname(entry.name).toLowerCase())) {
      files.push(fullPath)
    }
  }

  return files
}

function splitWikilinkList(value) {
  const trimmed = value.trim()
  const matches = [...trimmed.matchAll(/\[\[[^\]]+\]\]/g)].map((match) => match[0])
  if (matches.length === 0) return null

  const remainder = trimmed.replace(/\[\[[^\]]+\]\]/g, "").replace(/[,\s]/g, "")
  return remainder === "" ? matches : null
}

function quoteYamlString(value) {
  return `'${value.replace(/'/g, "''")}'`
}

function hasUnescapedDoubleQuote(value) {
  for (let i = 0; i < value.length; i += 1) {
    if (value[i] === '"' && value[i - 1] !== "\\") {
      return true
    }
  }
  return false
}

function normalizeFrontmatter(frontmatter) {
  return frontmatter
    .split("\n")
    .map((line) => {
      if (/^[A-Za-z0-9_-]+:\s*"[^"\n]*$/.test(line)) {
        return `${line}"`
      }

      const match = line.match(/^([A-Za-z0-9_-]+):\s*(.+)$/)
      if (!match) return line

      const [, key, value] = match
      const trimmedValue = value.trim()
      if (trimmedValue.startsWith('"') && trimmedValue.endsWith('"')) {
        const innerValue = trimmedValue.slice(1, -1)
        if (hasUnescapedDoubleQuote(innerValue)) {
          return `${key}: ${quoteYamlString(innerValue)}`
        }
      }

      const wikilinks = splitWikilinkList(value)
      if (!wikilinks || wikilinks.length <= 1) return line

      return [`${key}:`, ...wikilinks.map((link) => `  - "${link}"`)].join("\n")
    })
    .join("\n")
}

function normalizeMarkdown(markdown) {
  if (!markdown.startsWith("---\n")) return markdown

  const end = markdown.indexOf("\n---", 4)
  if (end === -1) return markdown

  const frontmatter = markdown.slice(4, end)
  const rest = markdown.slice(end)
  const normalized = normalizeFrontmatter(frontmatter)
  return `---\n${normalized}${rest}`
}

function normalizeMarkdownTree(rootDir) {
  for (const filePath of walkMarkdownFiles(rootDir)) {
    const input = fs.readFileSync(filePath, "utf8")
    const output = normalizeMarkdown(input)
    if (output !== input) {
      fs.writeFileSync(filePath, output)
    }
  }
}

if (require.main === module) {
  const rootDir = process.argv[2]
  if (!rootDir) {
    console.error("Usage: node scripts/normalize-frontmatter.js <markdown-root>")
    process.exit(1)
  }
  normalizeMarkdownTree(rootDir)
}

module.exports = {
  normalizeFrontmatter,
  normalizeMarkdown,
  normalizeMarkdownTree,
}

const excludedNames = new Set([
  ".git",
  ".venv",
  "node_modules",
  "__pycache__",
  ".pytest_cache",
  ".mypy_cache",
  ".ruff_cache",
  ".DS_Store",
])

const publishableRootNames = new Set([
  "10_wiki",
  "30_maps",
])

const blockedRootFiles = new Set([
  "manifest.yaml",
  "llms.txt",
])

function toSegments(filePath) {
  return filePath.split(/[\\/]+/).filter(Boolean)
}

function shouldExcludePath(filePath) {
  const segments = toSegments(filePath)
  if (segments.some((segment) => {
    return (
      excludedNames.has(segment) ||
      segment.endsWith(".egg-info") ||
      segment.endsWith(".pyc")
    )
  })) {
    return true
  }

  if (segments.length === 0) {
    return false
  }

  return !publishableRootNames.has(segments[0])
}

function shouldBlockPublicPath(urlPath) {
  let normalized
  try {
    normalized = decodeURIComponent(urlPath)
  } catch {
    return true
  }
  const segments = toSegments(normalized.replace(/\\/g, "/"))
  const safeSegments = []
  for (const segment of segments) {
    if (segment === ".") {
      continue
    }
    if (segment === "..") {
      safeSegments.pop()
      continue
    }
    safeSegments.push(segment)
  }
  if (safeSegments.length === 0) {
    return false
  }
  const top = safeSegments[0]
  if (safeSegments.length === 1 && blockedRootFiles.has(top)) {
    return true
  }
  if (top === "static" || top === "tags") {
    return false
  }
  if (top.includes(".")) {
    return false
  }
  return !publishableRootNames.has(top)
}

const rsyncExcludeArgs = [
  "--no-links",
  "--exclude=.git/",
  "--exclude=.venv/",
  "--exclude=node_modules/",
  "--exclude=__pycache__/",
  "--exclude=.pytest_cache/",
  "--exclude=.mypy_cache/",
  "--exclude=.ruff_cache/",
  "--exclude=*.egg-info/",
  "--exclude=*.pyc",
  "--exclude=.DS_Store",
  "--exclude=/00_raw/",
  "--exclude=/05_capture/",
  "--exclude=/20_human/",
  "--exclude=/20_self/",
  "--exclude=/40_agent_context/",
  "--exclude=/50_graph_exports/",
  "--exclude=/manifest.yaml",
  "--exclude=/llms.txt",
  "--exclude=/planning/",
  "--exclude=/execution/",
  "--exclude=/llm-wiki/",
  "--include=/10_wiki/***",
  "--include=/30_maps/***",
  "--exclude=/*",
]

module.exports = {
  blockedRootFiles,
  publishableRootNames,
  rsyncExcludeArgs,
  shouldBlockPublicPath,
  shouldExcludePath,
}

if (require.main === module) {
  for (const arg of rsyncExcludeArgs) {
    console.log(arg)
  }
}

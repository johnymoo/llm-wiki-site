const fs = require("fs")
const path = require("path")
const { shouldBlockPublicPath } = require("./sync-excludes")

function decodeUrlPath(urlPath) {
  return decodeURIComponent(urlPath)
}

function isWithin(root, candidate) {
  const relative = path.relative(root, candidate)
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative))
}

function existingFile(candidate) {
  if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
    return candidate
  }
  return null
}

function resolveStaticFallback(publicDir, urlPath) {
  const root = path.resolve(publicDir)
  const decodedPath = decodeUrlPath(urlPath)
  const filePath = path.resolve(root, `.${path.posix.normalize(decodedPath)}`)

  if (!isWithin(root, filePath)) {
    return null
  }
  if (shouldBlockPublicPath(urlPath)) {
    return null
  }

  const exactFile = existingFile(filePath)
  if (exactFile) {
    return { filePath: exactFile, status: 200 }
  }

  const htmlPath = filePath + ".html"
  if (isWithin(root, htmlPath) && existingFile(htmlPath)) {
    return { filePath: htmlPath, status: 200 }
  }

  const indexPath = path.join(filePath, "index.html")
  if (isWithin(root, indexPath) && existingFile(indexPath)) {
    return { filePath: indexPath, status: 200 }
  }

  const notFound = path.join(root, "404.html")
  if (existingFile(notFound)) {
    return { filePath: notFound, status: 404 }
  }

  return null
}

module.exports = {
  decodeUrlPath,
  isWithin,
  resolveStaticFallback,
}

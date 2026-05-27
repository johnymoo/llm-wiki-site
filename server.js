const express = require("express");
const { execFile } = require("child_process");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 49345;
const HOST = process.env.HOST || "0.0.0.0";
const STATE_FILE = path.join(__dirname, "sync-state.json");
const WIKI_DIR = path.isAbsolute(process.env.WIKI_DIR || "")
  ? process.env.WIKI_DIR
  : path.resolve(__dirname, process.env.WIKI_DIR || "../llm-wiki");
const PUBLIC_DIR = path.join(__dirname, "quartz", "public");

let syncLock = false;

function computeContentHash() {
  const hash = crypto.createHash("md5");
  const walk = (dir) => {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (["code", "queries", ".git", "node_modules"].includes(entry.name)) continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full);
        } else if (/\.(md|jpg|jpeg|png)$/i.test(entry.name)) {
          const stat = fs.statSync(full);
          hash.update(`${full}:${stat.mtimeMs}`);
        }
      }
    } catch (e) {}
  };
  walk(WIKI_DIR);
  return hash.digest("hex");
}

function readState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
  } catch {
    return { lastSyncTime: null, duration: null, success: null, contentHash: null };
  }
}

function writeState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

app.get("/api/status", (req, res) => {
  const state = readState();
  const currentHash = computeContentHash();
  res.json({
    ...state,
    currentContentHash: currentHash,
    needsSync: state.contentHash !== currentHash,
  });
});

app.post("/api/sync", (req, res) => {
  if (syncLock) {
    return res.status(429).json({ success: false, error: "Sync already in progress" });
  }
  syncLock = true;
  const startTime = Date.now();

  execFile("bash", [path.join(__dirname, "build.sh")], { cwd: __dirname }, (error, stdout, stderr) => {
    const duration = (Date.now() - startTime) / 1000;
    syncLock = false;

    if (error) {
      const state = {
        lastSyncTime: new Date().toISOString(),
        duration,
        success: false,
        contentHash: null,
        error: stderr || error.message,
      };
      writeState(state);
      return res.json(state);
    }

    const contentHash = computeContentHash();
    const state = {
      lastSyncTime: new Date().toISOString(),
      duration,
      success: true,
      contentHash,
    };
    writeState(state);
    res.json(state);
  });
});

app.use(express.static(PUBLIC_DIR));

app.get("*", (req, res) => {
  const filePath = path.join(PUBLIC_DIR, req.path);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    return res.sendFile(filePath);
  }
  const htmlPath = filePath + ".html";
  if (fs.existsSync(htmlPath)) {
    return res.sendFile(htmlPath);
  }
  const indexPath = path.join(filePath, "index.html");
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  const notFound = path.join(PUBLIC_DIR, "404.html");
  if (fs.existsSync(notFound)) {
    return res.status(404).sendFile(notFound);
  }
  res.status(404).send("Not Found");
});

app.listen(PORT, HOST, () => {
  console.log(`LLM Wiki server running at http://${HOST}:${PORT}`);
});

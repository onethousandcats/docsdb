#!/usr/bin/env node
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { access, readFile } from "node:fs/promises";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..", "docsdb");

const indexCandidates = [
  path.resolve(rootDir, "docsdb.json"),
  path.resolve(rootDir, "docs.db.json"),
];

const contentTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
]);

async function warnIfMissingIndex() {
  for (const candidate of indexCandidates) {
    try {
      await access(candidate);
      return;
    } catch {
      // Keep checking.
    }
  }
  console.warn("Warning: index JSON not found. Run npm run build first.");
}

function resolvePath(requestUrl) {
  const url = new URL(requestUrl, "http://localhost");
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === "/") {
    pathname = "/search.html";
  }
  const resolved = path.resolve(rootDir, `.${pathname}`);
  if (resolved !== rootDir && !resolved.startsWith(`${rootDir}${path.sep}`)) {
    return null;
  }
  return resolved;
}

function getContentType(filePath) {
  return contentTypes.get(path.extname(filePath).toLowerCase()) ||
    "application/octet-stream";
}

function startServer(ports, index = 0) {
  if (index >= ports.length) {
    console.error("No available ports found (4173-4175).");
    process.exit(2);
  }

  const port = ports[index];
  const server = http.createServer(async (req, res) => {
    try {
      const resolved = resolvePath(req.url ?? "/");
      if (!resolved) {
        res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Forbidden");
        return;
      }

      const data = await readFile(resolved);
      res.writeHead(200, { "Content-Type": getContentType(resolved) });
      res.end(data);
    } catch {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
    }
  });

  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      startServer(ports, index + 1);
    } else {
      console.error(`Server error: ${error.message}`);
      process.exit(2);
    }
  });

  server.listen(port, () => {
    console.log(`Serving docsdb at http://localhost:${port}`);
    console.log("Press Ctrl+C to stop.");
  });

  process.on("SIGINT", () => {
    console.log("Shutting down...");
    server.close(() => process.exit(0));
  });
}

await warnIfMissingIndex();
startServer([4173, 4174, 4175]);

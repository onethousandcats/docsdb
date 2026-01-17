#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const primaryIndexPath = path.resolve(repoRoot, "docsdb", "docsdb.json");
const fallbackIndexPath = path.resolve(repoRoot, "docsdb", "docs.db.json");

function printUsage() {
  console.error("Usage: docsdb query [options]");
  console.error("Options:");
  console.error("  --type <value>");
  console.error("  --status <value>");
  console.error("  --owner <value>");
  console.error("  --tag <value>");
  console.error("  --text <value>");
  console.error("  --service <value>");
  console.error("  --severity <value>");
  console.error("  --json");
  console.error("  --limit <n> (default 50)");
}

function parseArgs(argv) {
  const args = { json: false, limit: 50 };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) {
      throw new Error(`Unexpected argument: ${arg}`);
    }

    switch (arg) {
      case "--json":
        args.json = true;
        break;
      case "--type":
      case "--status":
      case "--owner":
      case "--tag":
      case "--text":
      case "--service":
      case "--severity":
      case "--limit": {
        const value = argv[i + 1];
        if (!value || value.startsWith("--")) {
          throw new Error(`Missing value for ${arg}`);
        }
        i += 1;
        if (arg === "--limit") {
          const parsed = Number.parseInt(value, 10);
          if (Number.isNaN(parsed) || parsed <= 0) {
            throw new Error("Limit must be a positive integer");
          }
          args.limit = parsed;
        } else {
          args[arg.slice(2)] = value;
        }
        break;
      }
      case "--help":
        args.help = true;
        break;
      default:
        throw new Error(`Unknown option: ${arg}`);
    }
  }
  return args;
}

function normalizeText(value) {
  return value?.toString().toLowerCase();
}

async function loadIndex() {
  try {
    return await readFile(primaryIndexPath, "utf8");
  } catch {
    try {
      return await readFile(fallbackIndexPath, "utf8");
    } catch {
      throw new Error(
        "Index file not found. Run npm run build:index to generate docsdb/docs.db.json."
      );
    }
  }
}

let filters;
try {
  filters = parseArgs(process.argv.slice(2));
  if (filters.help) {
    printUsage();
    process.exit(0);
  }
} catch (error) {
  console.error(error.message);
  printUsage();
  process.exit(2);
}

let docs;
try {
  const raw = await loadIndex();
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error("Index JSON is not an array");
  }
  docs = parsed;
} catch (error) {
  console.error(error.message);
  process.exit(2);
}

const ownerNeedle = normalizeText(filters.owner);
const textNeedle = normalizeText(filters.text);

const results = docs.filter((doc) => {
  if (filters.type && doc.type !== filters.type) {
    return false;
  }
  if (filters.status && doc.status !== filters.status) {
    return false;
  }
  if (filters.service && doc.service !== filters.service) {
    return false;
  }
  if (filters.severity && doc.severity !== filters.severity) {
    return false;
  }
  if (filters.tag) {
    const tags = Array.isArray(doc.tags) ? doc.tags : [];
    if (!tags.includes(filters.tag)) {
      return false;
    }
  }
  if (ownerNeedle) {
    const owner = normalizeText(doc.owner);
    if (!owner || !owner.includes(ownerNeedle)) {
      return false;
    }
  }
  if (textNeedle) {
    const haystack = normalizeText(
      `${doc.title ?? ""} ${doc.summary ?? ""}`
    );
    if (!haystack.includes(textNeedle)) {
      return false;
    }
  }
  return true;
});

results.sort((a, b) => {
  if (a.type === b.type) {
    return String(a.id).localeCompare(String(b.id));
  }
  return String(a.type).localeCompare(String(b.type));
});

const limited = results.slice(0, filters.limit);

if (limited.length === 0) {
  console.error("No matching docs found.");
  process.exit(1);
}

if (filters.json) {
  console.log(JSON.stringify(limited, null, 2));
  process.exit(0);
}

for (const doc of limited) {
  console.log(`${doc.id}  ${doc.type}  ${doc.title}  (${doc.path})`);
}

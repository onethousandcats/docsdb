#!/usr/bin/env node
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

function usage() {
  console.error("Usage:");
  console.error(
    "  npm run new:adr -- --title \"Some Title\" --owner \"Sales Tools\" [--status proposed] [--tags devops,release] [--summary \"...\"] [--audience dev,ops]"
  );
  console.error(
    "  npm run new:runbook -- --title \"Some Title\" --owner \"Sales Tools\" --service \"pricing-engine\" [--status active] [--tags ops,prod] [--summary \"...\"] [--audience dev,ops]"
  );
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) {
      throw new Error(`Unexpected argument: ${arg}`);
    }
    const key = arg.slice(2);
    const value = argv[i + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for ${arg}`);
    }
    i += 1;
    args[key] = value;
  }
  return args;
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function splitList(value) {
  if (!value) return undefined;
  const items = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length ? items : undefined;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

async function nextAdrNumber() {
  const adrDir = path.resolve(repoRoot, "docs", "adr");
  await mkdir(adrDir, { recursive: true });
  const files = await readdir(adrDir, { withFileTypes: true });
  const numbers = files
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .map((name) => {
      const match = name.match(/adr-(\d{4})-/);
      return match ? Number.parseInt(match[1], 10) : null;
    })
    .filter((value) => Number.isInteger(value));
  const max = numbers.length ? Math.max(...numbers) : 0;
  return String(max + 1).padStart(4, "0");
}

async function ensureFileDoesNotExist(filePath) {
  try {
    await readFile(filePath, "utf8");
    return false;
  } catch {
    return true;
  }
}

function frontmatterBlock(data) {
  const lines = ["---"];
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      lines.push(`${key}: [${value.join(", ")}]`);
    } else {
      lines.push(`${key}: ${value}`);
    }
  }
  lines.push("---", "");
  return lines.join("\n");
}

async function createAdr(args) {
  if (!args.title || !args.owner) {
    throw new Error("ADR requires --title and --owner");
  }

  const number = await nextAdrNumber();
  const slug = slugify(args.title);
  const fileName = `adr-${number}-${slug}.md`;
  const dir = path.resolve(repoRoot, "docs", "adr");
  const filePath = path.resolve(dir, fileName);

  if (!(await ensureFileDoesNotExist(filePath))) {
    throw new Error(`File already exists: ${filePath}`);
  }

  const created = today();
  const frontmatter = frontmatterBlock({
    id: `adr-${number}`,
    type: "adr",
    title: args.title,
    status: args.status ?? "proposed",
    owner: args.owner,
    tags: splitList(args.tags),
    created,
    updated: created,
    summary: args.summary,
    audience: splitList(args.audience),
  });

  const body = [
    "# Context",
    "",
    "# Decision",
    "",
    "# Consequences",
    "",
  ].join("\n");

  await mkdir(dir, { recursive: true });
  await writeFile(filePath, `${frontmatter}${body}`, "utf8");
  return filePath;
}

async function createRunbook(args) {
  if (!args.title || !args.owner || !args.service) {
    throw new Error("Runbook requires --title, --owner, and --service");
  }

  const slug = slugify(args.title);
  const dir = path.resolve(repoRoot, "docs", "runbooks");
  const fileName = `runbook-${slug}.md`;
  const filePath = path.resolve(dir, fileName);

  if (!(await ensureFileDoesNotExist(filePath))) {
    throw new Error(`File already exists: ${filePath}`);
  }

  const created = today();
  const frontmatter = frontmatterBlock({
    id: `runbook-${slug}`,
    type: "runbook",
    title: args.title,
    status: args.status ?? "active",
    owner: args.owner,
    service: args.service,
    tags: splitList(args.tags),
    created,
    updated: created,
    summary: args.summary,
    audience: splitList(args.audience),
  });

  const body = [
    "# Purpose",
    "",
    "# Preconditions",
    "",
    "# Steps",
    "",
    "# Rollback",
    "",
    "# Verification",
    "",
  ].join("\n");

  await mkdir(dir, { recursive: true });
  await writeFile(filePath, `${frontmatter}${body}`, "utf8");
  return filePath;
}

async function main() {
  const command = process.argv[2];
  if (!command || command === "--help" || command === "-h") {
    usage();
    process.exit(2);
  }

  let args;
  try {
    args = parseArgs(process.argv.slice(3));
  } catch (error) {
    console.error(error.message);
    usage();
    process.exit(2);
  }

  try {
    const filePath =
      command === "adr"
        ? await createAdr(args)
        : command === "runbook"
          ? await createRunbook(args)
          : null;

    if (!filePath) {
      console.error(`Unknown command: ${command}`);
      usage();
      process.exit(2);
    }

    console.log(`Created ${path.relative(repoRoot, filePath)}`);
    console.log("Next: npm run build");
  } catch (error) {
    console.error(error.message);
    process.exit(2);
  }
}

await main();

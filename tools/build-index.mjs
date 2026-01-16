import { readFile, stat, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { glob } from "glob";
import matter from "gray-matter";
import Ajv from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const schemaPath = path.resolve(repoRoot, "schema.json");
const outputDir = path.resolve(repoRoot, "docsdb");
const outputPath = path.resolve(outputDir, "docsdb.json");

const metadataFields = [
  "id",
  "type",
  "title",
  "owner",
  "status",
  "created",
  "updated",
  "tags",
  "service",
  "severity",
  "audience",
  "summary",
];

function formatErrors(errors) {
  return errors.map((error) => {
    const pathLabel = error.instancePath ? error.instancePath : "(root)";
    return `${pathLabel} ${error.message}`;
  });
}

function hasFrontmatter(raw) {
  return raw.startsWith("---\n") || raw.startsWith("---\r\n");
}

function normalizeFrontmatterDates(data) {
  for (const [key, value] of Object.entries(data)) {
    if (value instanceof Date) {
      data[key] = value.toISOString().slice(0, 10);
    }
  }
}

function extractWikiLinks(body) {
  const links = [];
  const pattern = /\[\[([^[\]]+)\]\]/g;
  let match;
  while ((match = pattern.exec(body)) !== null) {
    const value = match[1].trim();
    if (value) {
      links.push(value);
    }
  }
  return links;
}

function stripLinkSuffix(target) {
  return target.split("#")[0].split("?")[0];
}

function resolveMarkdownLinks(body, currentFile, idByPath) {
  const links = [];
  const pattern = /\[[^\]]*\]\(([^)]+)\)/g;
  let match;
  while ((match = pattern.exec(body)) !== null) {
    const rawTarget = match[1].trim();
    if (!rawTarget || rawTarget.startsWith("#")) {
      continue;
    }
    if (/^(https?:|mailto:|tel:)/i.test(rawTarget)) {
      continue;
    }
    const target = stripLinkSuffix(rawTarget);
    if (!target.endsWith(".md")) {
      continue;
    }

    let resolvedPath;
    if (target.startsWith("/")) {
      resolvedPath = path.resolve(repoRoot, `.${target}`);
    } else {
      resolvedPath = path.resolve(path.dirname(currentFile), target);
    }

    const linkedId = idByPath.get(resolvedPath);
    if (linkedId) {
      links.push(linkedId);
    }
  }
  return links;
}

const schemaRaw = await readFile(schemaPath, "utf8");
const schema = JSON.parse(schemaRaw);

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validate = ajv.compile(schema);

const files = await glob("docs/**/*.md", { nodir: true });

if (files.length === 0) {
  console.error("No Markdown files found under docs/**");
  process.exit(1);
}

const entries = [];
const idByPath = new Map();
const fileById = new Map();
let failed = false;

for (const file of files) {
  const raw = await readFile(file, "utf8");

  if (!hasFrontmatter(raw)) {
    console.error(`${file}: missing YAML frontmatter (--- at top)`);
    failed = true;
    continue;
  }

  let data;
  let content;
  try {
    const parsed = matter(raw);
    data = parsed.data;
    content = parsed.content;
  } catch (error) {
    console.error(`${file}: failed to parse frontmatter: ${error.message}`);
    failed = true;
    continue;
  }

  normalizeFrontmatterDates(data);

  const valid = validate(data);
  if (!valid) {
    console.error(`${file}: frontmatter validation failed`);
    for (const message of formatErrors(validate.errors ?? [])) {
      console.error(`  - ${message}`);
    }
    failed = true;
    continue;
  }

  const docId = data.id;
  if (fileById.has(docId)) {
    console.error(
      `Duplicate id "${docId}" found in ${file} and ${fileById.get(docId)}`
    );
    failed = true;
    continue;
  }

  fileById.set(docId, file);
  idByPath.set(path.resolve(file), docId);

  const stats = await stat(file);
  const entry = {
    id: docId,
    type: data.type,
    title: data.title,
    owner: data.owner,
    path: file,
    lastModified: stats.mtime.toISOString(),
    linksTo: [],
  };

  for (const field of metadataFields) {
    if (field in data && entry[field] === undefined) {
      entry[field] = data[field];
    }
  }

  entry.__content = content;
  entry.__filePath = path.resolve(file);
  entries.push(entry);
}

if (failed) {
  process.exit(1);
}

for (const entry of entries) {
  const wikiLinks = extractWikiLinks(entry.__content);
  const mdLinks = resolveMarkdownLinks(
    entry.__content,
    entry.__filePath,
    idByPath
  );
  const unique = new Set([...wikiLinks, ...mdLinks].filter(Boolean));
  entry.linksTo = Array.from(unique).sort();
  delete entry.__content;
  delete entry.__filePath;
}

entries.sort((a, b) => a.id.localeCompare(b.id));

await mkdir(outputDir, { recursive: true });
await writeFile(outputPath, JSON.stringify(entries, null, 2) + "\n", "utf8");

console.log(`Wrote ${entries.length} docs to ${path.relative(repoRoot, outputPath)}.`);

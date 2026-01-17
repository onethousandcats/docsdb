import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { glob } from "glob";
import matter from "gray-matter";
import Ajv from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const schemaPath = path.resolve(__dirname, "..", "docsdb", "schema.json");

function formatErrors(errors) {
  return errors.map((error) => {
    const pathLabel = error.instancePath ? error.instancePath : "(root)";
    return `${pathLabel} ${error.message}`;
  });
}

function hasFrontmatter(raw) {
  return raw.startsWith("---\n") || raw.startsWith("---\r\n");
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

let failed = false;

for (const file of files) {
  const raw = await readFile(file, "utf8");

  if (!hasFrontmatter(raw)) {
    console.error(`${file}: missing YAML frontmatter (--- at top)`);
    failed = true;
    continue;
  }

  let data;
  try {
    const parsed = matter(raw);
    data = parsed.data;
  } catch (error) {
    console.error(`${file}: failed to parse frontmatter: ${error.message}`);
    failed = true;
    continue;
  }

  for (const [key, value] of Object.entries(data)) {
    if (value instanceof Date) {
      data[key] = value.toISOString().slice(0, 10);
    }
  }

  const valid = validate(data);
  if (!valid) {
    console.error(`${file}: frontmatter validation failed`);
    for (const message of formatErrors(validate.errors ?? [])) {
      console.error(`  - ${message}`);
    }
    failed = true;
  }
}

if (failed) {
  process.exit(1);
}

console.log(`Validated ${files.length} Markdown file(s).`);

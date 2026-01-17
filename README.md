# docsdb

docsdb validates Markdown documentation by enforcing YAML frontmatter with a
JSON Schema.

## Requirements

- Node.js 20

## Usage

Install dependencies:

```bash
npm install
```

Validate docs under `docs/**`:

```bash
npm run validate:docs
```

Build the index (also validates docs):

```bash
npm run build
```

Query the index:

```bash
npm run query -- --type adr --status accepted
npm run query -- --owner "Sales Tools"
npm run query -- --tag devops --limit 20
npm run query -- --text "managed identity" --json
```

Create new docs:

```bash
npm run new:adr -- --title "Release Process Modernization" --owner "Sales Tools" --tags release,devops
npm run new:runbook -- --title "Restart pricing engine" --owner "Sales Tools" --service "pricing-engine"
```

## Schema

The schema in `docsdb/schema.json` requires `id`, `type`, `title`, and `owner`
for all documents. Some types add more requirements (for example ADRs require
`status` and `created`).

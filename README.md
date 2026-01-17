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

## Schema

The schema in `docsdb/schema.json` requires `id`, `type`, `title`, and `owner`
for all documents. Some types add more requirements (for example ADRs require
`status` and `created`).

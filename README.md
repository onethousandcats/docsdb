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

## Schema

The schema in `schema.json` requires `id`, `type`, `title`, and `owner` for all
documents. Some types add more requirements (for example ADRs require `status`
and `created`).

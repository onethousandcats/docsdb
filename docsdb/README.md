# docsdb index

`docs.db.json` is a generated index of validated Markdown docs.

Build the index:

```bash
npm run build
```

Serve the search UI and open http://localhost:4173:

```bash
npm run serve
```

Each entry includes:

- Core frontmatter metadata (such as `id`, `type`, `title`, `owner`)
- `path` for the doc file
- `lastModified` from the filesystem
- `linksTo` listing outbound doc ids referenced in the content

To query the index from the terminal, run:

```bash
npm run query -- --type adr
```

To view the search UI, start a local server in `docsdb/` and open `search.html`:

```bash
npx serve docsdb
```

Or:

```bash
python -m http.server
```

# scripts

## import-gangrey.mjs

Imports the archived [gangrey.com](https://web.archive.org/web/20161217014844/http://gangrey.com/)
site (via the Wayback Machine) into the **Gangrey Redux** section as Sanity
`post` documents.

It is dependency-free (Node 18+ built-ins only) and produces documents in the
exact shape the app reads — `section: "Gangrey Redux"`, body as Portable Text —
so imported stories show up at `/gangrey` and in the admin like any other post.

### Network requirement

`gangrey.com` and `web.archive.org` must be reachable from where you run this.
They are **blocked by the egress policy inside Claude Code's web/remote
environment**, so run this locally (or from any machine with open outbound
network). Writing to Sanity additionally needs `*.api.sanity.io` reachable.

### Quick start

```bash
# 0. Verify the parser offline (no network):
npm run import:gangrey -- --selftest

# 1. Dry run — fetch + parse, write NDJSON, no Sanity writes:
npm run import:gangrey -- --out gangrey-redux.ndjson

# 2. Real import — create/replace docs in Sanity:
SANITY_API_WRITE_TOKEN=sk... \
NEXT_PUBLIC_SANITY_PROJECT_ID=yourProjectId \
NEXT_PUBLIC_SANITY_DATASET=production \
npm run import:gangrey -- --write
```

The dry-run NDJSON can also be imported with the Sanity CLI directly:

```bash
npx sanity dataset import gangrey-redux.ndjson production --replace
```

### Flags

| Flag | Default | Meaning |
| --- | --- | --- |
| `--write` | off | Push `createOrReplace` mutations to Sanity (otherwise dry run). |
| `--out <file>` | `gangrey-redux.ndjson` | NDJSON output path for the dry run. |
| `--status <s>` | `draft` | `status` for created posts. Use `published` to go live on import. |
| `--limit <n>` | ∞ | Only process the first n stories (handy for a test run). |
| `--timestamp <ts>` | `20161217014844` | Preferred Wayback snapshot. |
| `--concurrency <n>` | `4` | Parallel page fetches. |
| `--dump <url>` | — | Fetch+parse one archived story URL, print the doc, exit. |
| `--selftest` | — | Run the offline parser check (no network). |

### How it works

1. Enumerates archived `gangrey.com/*` story URLs via the Wayback **CDX API**
   (filtering out feeds, pagination, taxonomy, and assets).
2. Fetches each snapshot's original bytes (`…<ts>id_/…`, i.e. no Wayback toolbar).
3. Extracts headline / byline / date / subheadline from meta tags with sensible
   fallbacks, and the article body from the WordPress content container.
4. Converts the body HTML to Portable Text (paragraphs, h2/h3, blockquote, and
   inline links / bold / italic — with Wayback-rewritten links unwrapped back to
   their originals).
5. Either writes NDJSON (default) or `createOrReplace`s the docs in Sanity.

Posts default to **draft** so you can review them in the admin before
publishing. The `_id` is derived from the slug, so re-running is idempotent.

> Note: the 2016 snapshot's exact HTML couldn't be inspected from the build
> environment (egress-blocked), so the body/byline extraction uses layered
> fallbacks. After a first real run, spot-check a few posts and tune the
> selectors in `extractBodyHtml` / `bylineFromBody` if needed — `--dump <url>`
> on a single story makes that quick.

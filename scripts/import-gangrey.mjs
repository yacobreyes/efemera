#!/usr/bin/env node
// Import the archived gangrey.com site (via the Wayback Machine) into the
// "Gangrey Redux" section as Sanity `post` documents.
//
// This script is dependency-free — it only uses Node built-ins (global fetch,
// available on Node 18+). It produces documents in the exact shape the app
// expects (see src/lib/sanity.ts SanityPost and src/app/admin/actions.ts).
//
// USAGE
//   # 1. Dry run — fetch + parse + write NDJSON, no Sanity writes (default):
//   node scripts/import-gangrey.mjs --out gangrey-redux.ndjson
//
//   # 2. Real import — create/replace docs in Sanity:
//   SANITY_API_WRITE_TOKEN=sk... \
//   NEXT_PUBLIC_SANITY_PROJECT_ID=abc123 \
//   NEXT_PUBLIC_SANITY_DATASET=production \
//   node scripts/import-gangrey.mjs --write
//
// USEFUL FLAGS
//   --write              Send mutations to Sanity (otherwise dry run only).
//   --out <file>         NDJSON output path for the dry run (default: gangrey-redux.ndjson).
//   --limit <n>          Only process the first n stories (handy for testing).
//   --timestamp <ts>     Wayback snapshot to prefer (default 20161217014844).
//   --status <status>    status field for created posts (default "draft").
//   --concurrency <n>    Parallel page fetches (default 4).
//   --dump <url>         Fetch+parse a single archived URL and print the result, then exit.
//
// NOTES
//   - Defaults to status "draft" so nothing goes live until you review it in the
//     admin. Pass --status published to publish on import.
//   - Re-running is safe: doc _id is derived from the slug, so it createOrReplaces.
//   - gangrey.com and web.archive.org must be reachable from wherever you run this.

import { writeFileSync, appendFileSync, existsSync, unlinkSync } from "node:fs";

const WAYBACK = "https://web.archive.org/web";
const SECTION = "Gangrey Redux";
const DEFAULT_BYLINE = "Gangrey";

// ---------------------------------------------------------------------------
// args
// ---------------------------------------------------------------------------
function parseArgs(argv) {
  const a = { write: false, out: "gangrey-redux.ndjson", limit: Infinity,
    timestamp: "20161217014844", status: "draft", concurrency: 4, dump: null };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === "--write") a.write = true;
    else if (k === "--out") a.out = argv[++i];
    else if (k === "--limit") a.limit = Number(argv[++i]);
    else if (k === "--timestamp") a.timestamp = argv[++i];
    else if (k === "--status") a.status = argv[++i];
    else if (k === "--concurrency") a.concurrency = Number(argv[++i]);
    else if (k === "--dump") a.dump = argv[++i];
    else if (k === "--selftest") a.selftest = true;
    else if (k === "--help" || k === "-h") { printHelp(); process.exit(0); }
    else { console.error(`Unknown flag: ${k}`); process.exit(1); }
  }
  return a;
}
function printHelp() {
  console.log("See the header comment of scripts/import-gangrey.mjs for usage.");
}

// ---------------------------------------------------------------------------
// fetch helpers (retry + polite throttle for the Wayback Machine)
// ---------------------------------------------------------------------------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchText(url, { tries = 4 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt < tries; attempt++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": "efemera-gangrey-import/1.0" } });
      if (res.status === 429 || res.status >= 500) throw new Error(`HTTP ${res.status}`);
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      return await res.text();
    } catch (err) {
      lastErr = err;
      await sleep(1000 * 2 ** attempt); // 1s, 2s, 4s, 8s
    }
  }
  throw lastErr;
}

// ---------------------------------------------------------------------------
// 1. enumerate archived story URLs via the Wayback CDX API
// ---------------------------------------------------------------------------
async function listStoryUrls(timestamp) {
  const year = timestamp.slice(0, 4);
  const cdx = new URL("https://web.archive.org/cdx/search/cdx");
  cdx.searchParams.set("url", "gangrey.com/*");
  cdx.searchParams.set("output", "json");
  cdx.searchParams.set("fl", "original,timestamp,statuscode,mimetype");
  cdx.searchParams.set("collapse", "urlkey");
  cdx.searchParams.set("filter", "statuscode:200");
  cdx.searchParams.set("filter", "mimetype:text/html");
  cdx.searchParams.set("from", `${Number(year) - 2}`);
  cdx.searchParams.set("to", year);

  const raw = await fetchText(cdx.toString());
  const rows = JSON.parse(raw);
  if (!Array.isArray(rows) || rows.length <= 1) return [];
  rows.shift(); // header row

  const seen = new Set();
  const out = [];
  for (const [original, ts] of rows) {
    if (!isStoryUrl(original)) continue;
    const key = canonicalSlug(original);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push({ url: original, timestamp: ts, slug: key });
  }
  return out;
}

// gangrey.com was a permalink blog: real posts live at gangrey.com/<slug>/.
// Skip feeds, pagination, taxonomy, assets, and the bare homepage.
function isStoryUrl(url) {
  let path;
  try { path = new URL(url.startsWith("http") ? url : `http://${url}`).pathname; }
  catch { return false; }
  if (path === "/" || path === "") return false;
  if (/\.(xml|json|css|js|png|jpe?g|gif|svg|ico|pdf|txt)$/i.test(path)) return false;
  if (/^\/(feed|wp-|tag|category|author|page|comments|search|2\d{3}\/?$)/i.test(path)) return false;
  if (/\/page\/\d+/i.test(path)) return false;
  if (/\/feed\/?$/i.test(path)) return false;
  return true;
}

function canonicalSlug(url) {
  try {
    const p = new URL(url.startsWith("http") ? url : `http://${url}`).pathname;
    const parts = p.split("/").filter(Boolean);
    return (parts[parts.length - 1] || "").toLowerCase().replace(/[^a-z0-9-]/g, "");
  } catch { return ""; }
}

// ---------------------------------------------------------------------------
// 2. fetch one archived page (id_ = original bytes, no Wayback rewriting/toolbar)
// ---------------------------------------------------------------------------
async function fetchArchived(url, timestamp) {
  const target = `${WAYBACK}/${timestamp}id_/${url}`;
  return fetchText(target);
}

// ---------------------------------------------------------------------------
// 3. extract fields from the HTML
// ---------------------------------------------------------------------------
function extract(html, fallbackUrl) {
  const title =
    meta(html, "og:title") ||
    tagText(html, "h1") ||
    (match(html, /<title[^>]*>([\s\S]*?)<\/title>/i) || "")
      .replace(/\s*[|–-]\s*gangrey.*$/i, "") ||
    "Untitled";

  const byline =
    meta(html, "article:author") ||
    metaName(html, "author") ||
    bylineFromBody(html) ||
    DEFAULT_BYLINE;

  const isoDate =
    meta(html, "article:published_time") ||
    attr(html, /<time[^>]*datetime="([^"]+)"/i) ||
    dateFromUrl(fallbackUrl) ||
    "";
  const date = (isoDate || "").slice(0, 10) || "2016-01-01";

  const subheadline = meta(html, "og:description") || metaName(html, "description") || "";

  const bodyHtml = extractBodyHtml(html);
  const body = htmlToPortableText(bodyHtml);

  return { title: clean(title), byline: clean(byline), date, subheadline: clean(subheadline), body };
}

// Try the common WordPress content containers, then fall back to <article>/<body>.
function extractBodyHtml(html) {
  const selectors = [
    /<div[^>]*class="[^"]*entry-content[^"]*"[^>]*>([\s\S]*?)<\/div>\s*(?:<\/div>|<footer|<div[^>]*class="[^"]*entry-footer)/i,
    /<div[^>]*class="[^"]*post-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]*class="[^"]*entry[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /<article[^>]*>([\s\S]*?)<\/article>/i,
    /<body[^>]*>([\s\S]*?)<\/body>/i,
  ];
  for (const re of selectors) {
    const m = html.match(re);
    if (m && m[1] && m[1].replace(/<[^>]+>/g, "").trim().length > 120) return m[1];
  }
  return html;
}

function bylineFromBody(html) {
  const m = match(html, /(?:class="[^"]*(?:author|byline)[^"]*"[^>]*>|by\s+)\s*([A-Z][A-Za-z.'-]+(?:\s+[A-Z][A-Za-z.'-]+){0,3})/);
  return m ? m.trim() : "";
}
function dateFromUrl(url) {
  const m = (url || "").match(/\/(20\d{2})\/(\d{2})\/(\d{2})\//);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : "";
}

// ---------------------------------------------------------------------------
// 4. HTML -> Portable Text (mirrors the block shape produced by src/lib/parseBody.ts)
// ---------------------------------------------------------------------------
function htmlToPortableText(htmlFragment) {
  // Drop scripts/styles/wayback junk, normalise breaks, split into blocks.
  let h = htmlFragment
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<br\s*\/?>/gi, "\n");

  const blocks = [];
  let i = 0;

  // Walk block-level elements in document order.
  const blockRe = /<(h[1-6]|p|blockquote|li)[^>]*>([\s\S]*?)<\/\1>/gi;
  let m;
  while ((m = blockRe.exec(h)) !== null) {
    const tag = m[1].toLowerCase();
    const inner = m[2];
    let style = "normal";
    if (tag === "h1" || tag === "h2") style = "h2";
    else if (tag === "h3" || tag === "h4" || tag === "h5" || tag === "h6") style = "h3";
    else if (tag === "blockquote") style = "blockquote";
    const block = inlineToBlock(inner, style, i);
    if (block && block.children.some((c) => c.text.trim())) {
      blocks.push(block);
      i++;
    }
  }

  // If nothing block-level was found, fall back to splitting stripped text.
  if (blocks.length === 0) {
    const text = decode(h.replace(/<[^>]+>/g, " ")).replace(/[ \t]+/g, " ");
    text.split(/\n{2,}/).map((s) => s.trim()).filter(Boolean).forEach((para, idx) => {
      blocks.push({ _type: "block", _key: `b${idx}`, style: "normal", markDefs: [],
        children: [{ _type: "span", _key: `b${idx}s0`, text: para, marks: [] }] });
    });
  }
  return blocks;
}

// Convert an inline HTML run into a Portable Text block, preserving links + bold/italic.
function inlineToBlock(inner, style, blockIndex) {
  const children = [];
  const markDefs = [];
  let spanIndex = 0;

  // Tokenise: links and emphasis become marked spans; everything else plain text.
  const tokenRe = /<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>|<(strong|b)\b[^>]*>([\s\S]*?)<\/\3>|<(em|i)\b[^>]*>([\s\S]*?)<\/\5>/gi;
  let last = 0;
  let t;
  const pushText = (raw) => {
    const text = decode(raw.replace(/<[^>]+>/g, ""));
    if (text) children.push({ _type: "span", _key: `b${blockIndex}s${spanIndex++}`, text, marks: [] });
  };
  while ((t = tokenRe.exec(inner)) !== null) {
    if (t.index > last) pushText(inner.slice(last, t.index));
    if (t[1] !== undefined) {
      const href = resolveHref(t[1]);
      const key = `lnk${blockIndex}_${spanIndex}`;
      markDefs.push({ _key: key, _type: "link", href });
      const text = decode(t[2].replace(/<[^>]+>/g, ""));
      children.push({ _type: "span", _key: `b${blockIndex}s${spanIndex++}`, text, marks: [key] });
    } else if (t[4] !== undefined) {
      children.push({ _type: "span", _key: `b${blockIndex}s${spanIndex++}`, text: decode(t[4].replace(/<[^>]+>/g, "")), marks: ["strong"] });
    } else if (t[6] !== undefined) {
      children.push({ _type: "span", _key: `b${blockIndex}s${spanIndex++}`, text: decode(t[6].replace(/<[^>]+>/g, "")), marks: ["em"] });
    }
    last = t.index + t[0].length;
  }
  if (last < inner.length) pushText(inner.slice(last));
  if (children.length === 0) children.push({ _type: "span", _key: `b${blockIndex}s0`, text: "", marks: [] });
  return { _type: "block", _key: `b${blockIndex}`, style, markDefs, children };
}

// Wayback rewrites links to /web/<ts>/<orig>. Recover the original target.
function resolveHref(href) {
  const m = href.match(/\/web\/\d+[a-z_]*\/(https?:\/\/.+)$/i);
  let url = m ? m[1] : href;
  if (url.startsWith("//")) url = "https:" + url;
  return url;
}

// ---------------------------------------------------------------------------
// small HTML utilities
// ---------------------------------------------------------------------------
function match(html, re) { const m = html.match(re); return m ? m[1] : ""; }
function attr(html, re) { const m = html.match(re); return m ? m[1] : ""; }
function meta(html, prop) {
  return attr(html, new RegExp(`<meta[^>]*property="${prop}"[^>]*content="([^"]*)"`, "i")) ||
         attr(html, new RegExp(`<meta[^>]*content="([^"]*)"[^>]*property="${prop}"`, "i"));
}
function metaName(html, name) {
  return attr(html, new RegExp(`<meta[^>]*name="${name}"[^>]*content="([^"]*)"`, "i")) ||
         attr(html, new RegExp(`<meta[^>]*content="([^"]*)"[^>]*name="${name}"`, "i"));
}
function tagText(html, tag) { return clean(decode(match(html, new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i")).replace(/<[^>]+>/g, ""))); }
function clean(s) { return (s || "").replace(/\s+/g, " ").trim(); }
function decode(s) {
  return (s || "")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#0?39;|&apos;|&rsquo;/g, "'").replace(/&lsquo;/g, "'")
    .replace(/&ldquo;|&rdquo;/g, '"').replace(/&nbsp;/g, " ").replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–").replace(/&hellip;/g, "…")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}

// ---------------------------------------------------------------------------
// build the Sanity document
// ---------------------------------------------------------------------------
function buildDoc(story, fields, status) {
  return {
    _id: `post-${story.slug}`,
    _type: "post",
    headline: fields.title,
    subheadline: fields.subheadline,
    slug: { _type: "slug", current: story.slug },
    section: SECTION,
    byline: fields.byline,
    date: fields.date,
    body: fields.body,
    status,
  };
}

// ---------------------------------------------------------------------------
// Sanity write
// ---------------------------------------------------------------------------
async function sanityMutate(docs) {
  const token = process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_WRITE_TOKEN;
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
  if (!token || !projectId) {
    throw new Error("Missing Sanity config: set SANITY_API_WRITE_TOKEN and NEXT_PUBLIC_SANITY_PROJECT_ID");
  }
  const url = `https://${projectId}.api.sanity.io/v2024-01-01/data/mutate/${dataset}`;
  // Chunk to stay well under request limits.
  for (let i = 0; i < docs.length; i += 25) {
    const chunk = docs.slice(i, i + 25);
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ mutations: chunk.map((doc) => ({ createOrReplace: doc })) }),
    });
    if (!res.ok) throw new Error(`Sanity error: ${await res.text()}`);
    console.log(`  wrote ${Math.min(i + 25, docs.length)}/${docs.length}`);
  }
}

// ---------------------------------------------------------------------------
// concurrency helper
// ---------------------------------------------------------------------------
async function mapPool(items, limit, fn) {
  const results = [];
  let idx = 0;
  const workers = Array.from({ length: Math.max(1, limit) }, async () => {
    while (idx < items.length) {
      const cur = idx++;
      results[cur] = await fn(items[cur], cur);
    }
  });
  await Promise.all(workers);
  return results;
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------
// Offline check of the parser/converter — no network needed. Run: --selftest
function selftest() {
  const html = `
    <html><head>
      <title>The Long Walk | Gangrey</title>
      <meta property="og:title" content="The Long Walk">
      <meta property="og:description" content="A reporter retraces the route.">
      <meta name="author" content="Jane Doe">
      <meta property="article:published_time" content="2015-08-12T09:00:00Z">
    </head><body>
      <div class="entry-content">
        <p>He walked for <strong>twelve</strong> hours, past the old <em>mill</em>.</p>
        <p>Read the <a href="/web/20161217id_/http://example.com/source">original report</a> here.</p>
        <h2>The river</h2>
        <blockquote>Nothing moved but the water.</blockquote>
        <p>The end.</p>
      </div>
      <footer>comments</footer>
    </body></html>`;
  const f = extract(html, "http://gangrey.com/the-long-walk/");
  const assert = (cond, msg) => { if (!cond) { console.error("FAIL:", msg); process.exitCode = 1; } else console.log("ok:", msg); };
  assert(f.title === "The Long Walk", `title => ${f.title}`);
  assert(f.byline === "Jane Doe", `byline => ${f.byline}`);
  assert(f.date === "2015-08-12", `date => ${f.date}`);
  assert(f.subheadline === "A reporter retraces the route.", `subheadline => ${f.subheadline}`);
  assert(f.body.length === 5, `block count => ${f.body.length}`);
  assert(f.body[0].children.some((c) => c.text === "twelve" && c.marks.includes("strong")), "bold span preserved");
  assert(f.body[0].children.some((c) => c.text === "mill" && c.marks.includes("em")), "italic span preserved");
  const linkBlock = f.body[1];
  assert(linkBlock.markDefs[0] && linkBlock.markDefs[0].href === "http://example.com/source", `wayback link unwrapped => ${linkBlock.markDefs[0] && linkBlock.markDefs[0].href}`);
  assert(f.body[2].style === "h2" && f.body[2].children[0].text === "The river", "h2 heading");
  assert(f.body[3].style === "blockquote", "blockquote style");
  console.log(JSON.stringify(buildDoc({ slug: "the-long-walk" }, f, "draft"), null, 2));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (process.argv.includes("--selftest")) { selftest(); return; }

  if (args.dump) {
    const html = await fetchArchived(args.dump, args.timestamp);
    const fields = extract(html, args.dump);
    console.log(JSON.stringify(buildDoc({ slug: canonicalSlug(args.dump) }, fields, args.status), null, 2));
    return;
  }

  console.log("Enumerating archived gangrey.com pages via the Wayback CDX API…");
  let stories = await listStoryUrls(args.timestamp);
  console.log(`Found ${stories.length} candidate story URLs.`);
  if (Number.isFinite(args.limit)) stories = stories.slice(0, args.limit);

  console.log(`Fetching + parsing ${stories.length} stories (concurrency ${args.concurrency})…`);
  const docs = [];
  let done = 0;
  await mapPool(stories, args.concurrency, async (story) => {
    try {
      const html = await fetchArchived(story.url, story.timestamp);
      const fields = extract(html, story.url);
      if (!fields.body.length) { console.warn(`  ! empty body, skipping ${story.url}`); return; }
      docs.push(buildDoc(story, fields, args.status));
    } catch (err) {
      console.warn(`  ! failed ${story.url}: ${err.message}`);
    } finally {
      if (++done % 10 === 0) console.log(`  …${done}/${stories.length}`);
    }
  });

  console.log(`Built ${docs.length} "Gangrey Redux" documents.`);

  if (args.write) {
    console.log("Writing to Sanity…");
    await sanityMutate(docs);
    console.log("Done. Posts created with status:", args.status);
  } else {
    if (existsSync(args.out)) unlinkSync(args.out);
    for (const doc of docs) appendFileSync(args.out, JSON.stringify(doc) + "\n");
    console.log(`Dry run — wrote NDJSON to ${args.out}`);
    console.log("Review it, then either:");
    console.log(`  • re-run with --write to push to Sanity, or`);
    console.log(`  • import directly:  npx sanity dataset import ${args.out} <dataset> --replace`);
  }
}

main().catch((err) => { console.error(err); process.exit(1); });

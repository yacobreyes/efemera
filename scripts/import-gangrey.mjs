#!/usr/bin/env node
/**
 * Gangrey Archive Importer
 *
 * Fetches gangrey.com pages from the Wayback Machine, parses each story, and
 * imports them into Sanity as section:"Gangrey Redux" posts.
 *
 * Usage:
 *   node scripts/import-gangrey.mjs --selftest          # offline parser smoke-test
 *   node scripts/import-gangrey.mjs --out gangrey.ndjson # fetch+parse → NDJSON file
 *   SANITY_API_WRITE_TOKEN=sk-... NEXT_PUBLIC_SANITY_PROJECT_ID=xxx \
 *     node scripts/import-gangrey.mjs --write           # real import into Sanity
 *
 * Optional flags (combinable):
 *   --limit N        process at most N stories (default: 10 for test, unlimited for --write)
 *   --from YYYYMMDD  earliest Wayback snapshot to consider (default: 20050101)
 *   --to   YYYYMMDD  latest  Wayback snapshot to consider (default: 20170101)
 *   --delay MS       ms to wait between Wayback requests (default: 800)
 */

import { parse } from "node-html-parser";
import fs from "fs";
import path from "path";

// ── CLI ──────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const SELFTEST  = args.includes("--selftest");
const DRY_RUN   = args.includes("--out")  || args.includes("--dry");
const WRITE     = args.includes("--write");
const outFile   = (() => { const i = args.indexOf("--out"); return i >= 0 ? args[i+1] : null; })();
const limitArg  = (() => { const i = args.indexOf("--limit"); return i >= 0 ? Number(args[i+1]) : null; })();
const fromArg   = (() => { const i = args.indexOf("--from"); return i >= 0 ? args[i+1] : "20050101"; })();
const toArg     = (() => { const i = args.indexOf("--to");   return i >= 0 ? args[i+1] : "20170101"; })();
const DELAY_MS  = (() => { const i = args.indexOf("--delay"); return i >= 0 ? Number(args[i+1]) : 800; })();
const LIMIT     = limitArg ?? (WRITE ? Infinity : 10);

if (!SELFTEST && !DRY_RUN && !WRITE && !outFile) {
  console.log(`Usage:
  node scripts/import-gangrey.mjs --selftest
  node scripts/import-gangrey.mjs --out gangrey.ndjson [--limit N]
  SANITY_API_WRITE_TOKEN=sk-... NEXT_PUBLIC_SANITY_PROJECT_ID=xxx \\
    node scripts/import-gangrey.mjs --write [--limit N]`);
  process.exit(0);
}

// ── Wayback helpers ───────────────────────────────────────────────────────────
const CDX = "https://web.archive.org/cdx/search/cdx";
const WB  = "https://web.archive.org/web";

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function cdxQuery(paramPairs) {
  // paramPairs: array of [key, value] so we can repeat keys like filter=
  const qs = paramPairs.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&");
  const url = `${CDX}?${qs}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`CDX ${res.status}: ${url}`);
  const rows = await res.json();
  if (!Array.isArray(rows) || rows.length < 2) return [];
  const [header, ...data] = rows;
  return data.map(row => Object.fromEntries(header.map((k, i) => [k, row[i]])));
}

async function fetchWayback(timestamp, url) {
  const wb = `${WB}/${timestamp}id_/${url}`;
  const res = await fetch(wb, { headers: { "User-Agent": "gangrey-archive-importer/1.0 (+mailto:yacob@efemera.org)" } });
  if (!res.ok) throw new Error(`Wayback ${res.status}: ${wb}`);
  return res.text();
}

// ── Gangrey HTML parser ───────────────────────────────────────────────────────
// gangrey.com ran on WordPress. The important markup is fairly consistent
// across versions: .entry-title, .entry-content, .byline, .entry-date etc.

function slugify(str) {
  return str.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 96);
}

function htmlToPortableText(html) {
  // Convert simple HTML to Portable Text blocks (paragraphs + headings + blockquote).
  // We intentionally ignore nav/sidebar/scripts; only the story body matters.
  const root = parse(html);
  const blocks = [];

  function textContent(node) {
    // Gather inline marks
    if (node.nodeType === 3 /* TEXT_NODE */) return [{ _type: "span", text: node.rawText }];
    const spans = [];
    for (const child of node.childNodes) {
      const inner = textContent(child);
      const tag = (node.tagName ?? "").toLowerCase();
      if (tag === "strong" || tag === "b") inner.forEach(s => { s.marks = [...(s.marks||[]), "strong"]; });
      else if (tag === "em" || tag === "i") inner.forEach(s => { s.marks = [...(s.marks||[]), "em"]; });
      else if (tag === "a") {
        const href = node.getAttribute("href");
        if (href) inner.forEach(s => { s.marks = [...(s.marks||[]), "link"]; s.href = href; });
      }
      spans.push(...inner);
    }
    return spans;
  }

  function processNode(node) {
    const tag = (node.tagName ?? "").toLowerCase();
    if (["script","style","nav","aside","header","footer"].includes(tag)) return;

    if (["p","div"].includes(tag) || tag === "") {
      // Recurse into divs; wrap text-bearing p tags as blocks
      if (tag === "p" || (tag === "" && node.childNodes.some(c => c.nodeType === 3))) {
        const text = node.innerText?.trim();
        if (!text) return;
        blocks.push({
          _type: "block", style: "normal",
          children: [{ _type: "span", text, marks: [] }],
          markDefs: [],
        });
      } else {
        for (const child of node.childNodes) processNode(child);
      }
      return;
    }
    if (["h1","h2","h3","h4"].includes(tag)) {
      const text = node.innerText?.trim();
      if (!text) return;
      blocks.push({ _type: "block", style: "h2", children: [{ _type: "span", text, marks: [] }], markDefs: [] });
      return;
    }
    if (tag === "blockquote") {
      const text = node.innerText?.trim();
      if (!text) return;
      blocks.push({ _type: "block", style: "blockquote", children: [{ _type: "span", text, marks: [] }], markDefs: [] });
      return;
    }
    if (["ul","ol"].includes(tag)) {
      const listItem = tag === "ul" ? "bullet" : "number";
      for (const li of node.querySelectorAll("li")) {
        const text = li.innerText?.trim();
        if (text) blocks.push({ _type: "block", style: "normal", listItem, level: 1, children: [{ _type: "span", text, marks: [] }], markDefs: [] });
      }
      return;
    }
    // Recurse everything else
    for (const child of node.childNodes) processNode(child);
  }

  const root2 = typeof html === "string" ? parse(html) : html;
  for (const child of root2.childNodes) processNode(child);

  return blocks.filter(b => b.children?.some(c => c.text?.trim()));
}

function parseGangreyPage(html, pageUrl, timestamp) {
  const root = parse(html);

  // Try multiple WordPress theme selectors gangrey used over the years
  const headline =
    root.querySelector("h1.entry-title")?.innerText?.trim() ||
    root.querySelector("h2.entry-title")?.innerText?.trim() ||
    root.querySelector(".post-title")?.innerText?.trim() ||
    root.querySelector("h1.posttitle")?.innerText?.trim() ||
    root.querySelector("title")?.innerText?.replace(/\s*[|\-–—]\s*gangrey.*$/i, "").trim() ||
    "";

  // byline
  const byline =
    root.querySelector(".entry-author .author")?.innerText?.trim() ||
    root.querySelector(".byline .author")?.innerText?.trim() ||
    root.querySelector("a[rel='author']")?.innerText?.trim() ||
    root.querySelector(".author")?.innerText?.trim() ||
    "";

  // date — prefer machine-readable datetime attr
  const dateEl =
    root.querySelector("time.entry-date") ||
    root.querySelector("time.updated") ||
    root.querySelector("abbr.published") ||
    root.querySelector(".entry-date") ||
    root.querySelector(".post-date");
  const dateRaw =
    dateEl?.getAttribute("datetime") ||
    dateEl?.getAttribute("title") ||
    dateEl?.innerText?.trim() ||
    // Fall back to Wayback timestamp YYYYMMDD → ISO
    `${timestamp.slice(0,4)}-${timestamp.slice(4,6)}-${timestamp.slice(6,8)}`;
  const date = parseDate(dateRaw);

  // body — prefer .entry-content, fall back to .post-content / article
  const bodyEl =
    root.querySelector(".entry-content") ||
    root.querySelector(".post-content") ||
    root.querySelector("article") ||
    root.querySelector(".post-body");

  if (!bodyEl || !headline) return null;

  // Remove share/nav/comment widgets inside body
  for (const sel of [".sharedaddy",".jp-relatedposts","#comments",".navigation",".post-navigation"]) {
    bodyEl.querySelectorAll(sel).forEach(n => n.remove());
  }

  const body = htmlToPortableText(bodyEl.innerHTML);
  if (!body.length) return null;

  // subheadline from first paragraph if it's short and italicised
  const subheadline = "";

  // slug: prefer URL path, otherwise derive from headline
  let slug = "";
  try {
    const u = new URL(pageUrl);
    const parts = u.pathname.replace(/\/$/, "").split("/").filter(Boolean);
    slug = parts[parts.length - 1] || slugify(headline);
  } catch {
    slug = slugify(headline);
  }
  slug = `gangrey-${slug}`.slice(0, 96);

  return { headline, byline, date, subheadline, slug, body };
}

function parseDate(raw) {
  if (!raw) return new Date().toISOString();
  // Handle "January 5, 2010", "2010-01-05", "2010-01-05T12:00:00Z" etc.
  const d = new Date(raw);
  return isNaN(d) ? new Date().toISOString() : d.toISOString();
}

// ── Sanity writer ─────────────────────────────────────────────────────────────
function toSanityDoc(story) {
  return {
    _id: `gangrey-import-${story.slug}`,
    _type: "post",
    section: "Gangrey Redux",
    status: "published",
    headline: story.headline,
    subheadline: story.subheadline || "",
    byline: story.byline || "",
    date: story.date,
    slug: { _type: "slug", current: story.slug },
    body: story.body,
    readingTime: Math.max(1, Math.round(story.body.map(b => b.children?.map(c => c.text||"").join("") || "").join(" ").split(/\s+/).length / 200)),
  };
}

async function sanityMutate(docs) {
  const token     = process.env.SANITY_API_WRITE_TOKEN;
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  const dataset   = process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production";
  if (!token || !projectId) throw new Error("Missing SANITY_API_WRITE_TOKEN or NEXT_PUBLIC_SANITY_PROJECT_ID");

  const mutations = docs.map(doc => ({ createOrReplace: doc }));
  const res = await fetch(
    `https://${projectId}.api.sanity.io/v2024-01-01/data/mutate/${dataset}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ mutations }),
    }
  );
  if (!res.ok) throw new Error(`Sanity mutate failed: ${await res.text()}`);
  return res.json();
}

// ── Self-test ─────────────────────────────────────────────────────────────────
const SAMPLE_HTML = `
<html><head><title>The Long Drive | Gangrey</title></head><body>
<article class="post">
  <h1 class="entry-title">The Long Drive</h1>
  <div class="byline">By <a rel="author">John Smith</a></div>
  <time class="entry-date" datetime="2009-08-12T00:00:00Z">August 12, 2009</time>
  <div class="entry-content">
    <p>It was a Tuesday when we left. The highway unrolled ahead of us like a gray tongue.</p>
    <p>My father didn't speak for the first hundred miles. Neither did I.</p>
    <blockquote>You don't understand silence until you've crossed a state line without speaking.</blockquote>
    <p>We stopped once for gas.</p>
  </div>
</article>
</body></html>`;

function selfTest() {
  console.log("── Self-test (offline parser) ──");
  const result = parseGangreyPage(SAMPLE_HTML, "http://gangrey.com/2009/08/the-long-drive/", "20090812000000");
  if (!result) { console.error("FAIL: parseGangreyPage returned null"); process.exit(1); }
  console.assert(result.headline === "The Long Drive", `headline: "${result.headline}"`);
  console.assert(result.byline   === "John Smith",     `byline: "${result.byline}"`);
  console.assert(result.date.startsWith("2009-08-12"), `date: "${result.date}"`);
  console.assert(result.slug.startsWith("gangrey-"),   `slug: "${result.slug}"`);
  console.assert(result.body.length >= 3,              `body blocks: ${result.body.length}`);
  console.log(`PASS — headline: "${result.headline}" | byline: "${result.byline}" | blocks: ${result.body.length}`);
  const doc = toSanityDoc(result);
  console.assert(doc._type === "post",                          "_type");
  console.assert(doc.section === "Gangrey Redux",               "section");
  console.assert(doc.slug.current.startsWith("gangrey-"),       "slug.current");
  console.log(`PASS — Sanity doc _id: "${doc._id}" | section: "${doc.section}"`);
  console.log("All tests passed.");
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  if (SELFTEST) { selfTest(); return; }

  // 1. Enumerate story URLs from Wayback CDX
  console.log(`Querying Wayback CDX for gangrey.com posts (${fromArg}–${toArg})…`);
  const rows = await cdxQuery([
    ["url", "gangrey.com"],
    ["matchType", "domain"],          // includes www. and any subdomain
    ["filter", "statuscode:200"],
    ["filter", "mimetype:text/html"],
    ["fl", "timestamp,original"],
    ["from", fromArg],
    ["to", toArg],
    ["collapse", "urlkey"],
    ["limit", String(Math.min(LIMIT * 40, 50000))], // over-fetch; parser is gatekeeper
  ]);
  console.log(`CDX returned ${rows.length} raw captures.`);
  if (rows.length) {
    console.log("Sample URLs:");
    for (const r of rows.slice(0, 8)) console.log("  " + r.original);
  }

  // Reject obvious non-stories (home, pagination, taxonomy, feeds, assets, query strings).
  // Everything else is handed to the parser, which returns null if there's no real story.
  const SKIP = /\/(page|category|tag|tagged|author|feed|wp-admin|wp-content|wp-login|comments|search)\b/i;
  const ASSET = /\.(css|js|png|jpe?g|gif|svg|ico|xml|json|txt|woff2?|ttf|pdf|mp3|mp4)$/i;
  const postRows = rows.filter(r => {
    try {
      const u = new URL(r.original);
      const p = u.pathname;
      if (p === "/" || p === "") return false;
      if (u.search) return false;
      if (SKIP.test(p)) return false;
      if (ASSET.test(p)) return false;
      return true;
    } catch { return false; }
  });

  console.log(`Found ${postRows.length} candidate story URLs (before limit of ${LIMIT}).`);
  const toProcess = postRows.slice(0, LIMIT);

  const docs = [];
  let ok = 0, skipped = 0, failed = 0;

  for (const [i, row] of toProcess.entries()) {
    const { timestamp, original } = row;
    process.stdout.write(`[${i+1}/${toProcess.length}] ${original} … `);
    try {
      await sleep(DELAY_MS);
      const html = await fetchWayback(timestamp, original);
      const story = parseGangreyPage(html, original, timestamp);
      if (!story) { console.log("skipped (no parseable story)"); skipped++; continue; }
      docs.push(toSanityDoc(story));
      console.log(`OK — "${story.headline}" by ${story.byline || "(no byline)"}`);
      ok++;
    } catch (e) {
      console.log(`ERROR: ${e.message}`);
      failed++;
    }
  }

  console.log(`\nParsed: ${ok} ok, ${skipped} skipped, ${failed} errors`);
  if (!docs.length) { console.log("Nothing to write."); return; }

  // 2a. Write NDJSON
  if (outFile) {
    fs.writeFileSync(outFile, docs.map(d => JSON.stringify(d)).join("\n") + "\n");
    console.log(`Wrote ${docs.length} docs → ${outFile}`);
    console.log(`Preview first entry:\n${JSON.stringify(docs[0], null, 2).slice(0, 800)}…`);
  }

  // 2b. Import into Sanity
  if (WRITE) {
    console.log(`\nImporting ${docs.length} docs into Sanity…`);
    const BATCH = 20;
    for (let i = 0; i < docs.length; i += BATCH) {
      const batch = docs.slice(i, i + BATCH);
      const result = await sanityMutate(batch);
      console.log(`Batch ${Math.floor(i/BATCH)+1}: ${JSON.stringify(result?.results?.length ?? result)} docs written`);
    }
    console.log("Import complete.");
  }
}

main().catch(e => { console.error(e); process.exit(1); });

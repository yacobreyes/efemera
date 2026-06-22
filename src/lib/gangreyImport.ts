// Shared logic for importing the Gangrey archive from the Wayback Machine.
// Used by the admin-triggered API route (runs on Vercel, which has the Sanity
// write token + internet). Mirrors scripts/import-gangrey.mjs.
import { parse } from "node-html-parser";
import type { PortableTextBlock } from "@portabletext/types";

const CDX = "https://web.archive.org/cdx/search/cdx";
const WB = "https://web.archive.org/web";

export const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// Wayback rate-limits aggressively (429/503) and also drops connections
// outright ("fetch failed"). Retry both status codes AND thrown network
// errors with exponential backoff.
async function fetchRetry(url: string, opts: RequestInit = {}, tries = 5): Promise<Response> {
  let delay = 1500;
  let lastErr: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, opts);
      if (res.status !== 429 && res.status !== 503) return res;
    } catch (e) {
      lastErr = e; // network drop — retry below
    }
    if (i < tries - 1) { await sleep(delay); delay *= 2; }
  }
  if (lastErr) throw lastErr;
  return fetch(url, opts);
}

export type GangreyStory = {
  headline: string; subheadline: string; byline: string; date: string;
  slug: string; body: PortableTextBlock[];
};
export type Candidate = { timestamp: string; original: string };

export async function listCandidates(from = "20050101", to = "20170101"): Promise<Candidate[]> {
  const pairs: [string, string][] = [
    ["output", "json"], ["url", "gangrey.com"], ["matchType", "domain"],
    ["filter", "statuscode:200"], ["filter", "mimetype:text/html"],
    ["fl", "timestamp,original"], ["from", from], ["to", to],
    ["collapse", "urlkey"], ["limit", "50000"],
  ];
  const qs = pairs.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&");
  const res = await fetchRetry(`${CDX}?${qs}`);
  if (!res.ok) throw new Error(`CDX ${res.status}`);
  const rows = await res.json();
  if (!Array.isArray(rows) || rows.length < 2) return [];
  const [header, ...data] = rows as string[][];
  const all = data.map(r => Object.fromEntries(header.map((k, i) => [k, r[i]]))) as unknown as Candidate[];

  const SKIP = /\/(page|category|tag|tagged|author|feed|wp-admin|wp-content|wp-login|comments|search)\b/i;
  const ASSET = /\.(css|js|png|jpe?g|gif|svg|ico|xml|json|txt|woff2?|ttf|pdf|mp3|mp4)$/i;
  return all.filter(r => {
    try {
      const u = new URL(r.original);
      const p = u.pathname;
      if (p === "/" || p === "") return false;
      if (!decodeURIComponent(p).replace(/\//g, "").trim()) return false;
      if (u.search) return false;
      if (SKIP.test(p)) return false;
      if (ASSET.test(p)) return false;
      return true;
    } catch { return false; }
  });
}

export async function fetchWayback(timestamp: string, url: string): Promise<string> {
  const res = await fetchRetry(`${WB}/${timestamp}id_/${url}`, {
    headers: { "User-Agent": "gangrey-archive-importer/1.0 (+mailto:yacob@efemera.org)" },
  });
  if (!res.ok) throw new Error(`Wayback ${res.status}`);
  return res.text();
}

function slugify(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-").slice(0, 96);
}

// Decode HTML entities (numeric + common named) that node-html-parser's
// innerText leaves raw — Gangrey's markup is full of &#8220; &#8217; etc.
function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&nbsp;/g, " ")
    .replace(/&hellip;/g, "…")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&ldquo;/g, "“").replace(/&rdquo;/g, "”")
    .replace(/&lsquo;/g, "‘").replace(/&rsquo;/g, "’")
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

const cleanText = (s: string) => decodeEntities(s).replace(/\s+/g, " ").trim();

// Gangrey ran on WordPress. The post meta line reads roughly:
// "Posted on Month D, YYYY by authorname [in Category]"
// We isolate the small element that holds that line (so the author can't bleed
// into body text) and pull both the date and author from it, keeping them
// consistent with each other.
const DATE_RE = /([A-Za-z]+ \d{1,2},?\s+\d{4})/;
const AUTHOR_RE = /\bby\s+([A-Za-z][A-Za-z.'\-]*(?:\s+[A-Za-z][A-Za-z.'\-]*){0,2})/i;
const META_LINE_RE = /(?:posted\s+on\s+)?[A-Za-z]+ \d{1,2},?\s+\d{4}\s+by\s+[A-Za-z]/i;

function titleCase(s: string) {
  return s.trim().split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractMetaFields(post: any, root: any, timestamp: string): { byline: string; date: string } {
  const fallbackDate = `${timestamp.slice(0, 4)}-${timestamp.slice(4, 6)}-${timestamp.slice(6, 8)}`;

  // Find the smallest element whose text is the meta line ("…DATE by AUTHOR").
  // Iterating typical meta containers; the matching one with short text wins so
  // we never grab the whole post body.
  let metaText = "";
  const scope = post ?? root;
  const candidates = scope.querySelectorAll(
    "p, div, small, span, li, em, address, .postmetadata, .entry-meta, .meta, .postmeta, .byline"
  );
  for (const el of candidates) {
    const t = cleanText(el.innerText ?? "");
    if (t.length && t.length < 140 && META_LINE_RE.test(t)) { metaText = t; break; }
  }

  let date = parseDate(fallbackDate);
  let byline = "";

  if (metaText) {
    const dm = metaText.match(DATE_RE);
    if (dm) { const d = new Date(dm[1]); if (!isNaN(+d)) date = d.toISOString(); }
    const am = metaText.match(AUTHOR_RE);
    if (am) {
      // Stop the author at "in"/"on"/category words just in case.
      const STOP = /^(in|on|under|filed|tagged|category|general)$/i;
      const name = am[1].split(/\s+/).filter(w => !STOP.test(w)).join(" ");
      if (name) byline = titleCase(name);
    }
  } else {
    // Fallback: <time datetime> for date, a[rel=author]/.author for byline.
    const timeEl = root.querySelector("time[datetime]");
    if (timeEl?.getAttribute?.("datetime")) date = parseDate(timeEl.getAttribute("datetime"));
    const authorEl = root.querySelector('a[rel="author"]') || root.querySelector(".author a");
    if (authorEl?.innerText) byline = titleCase(cleanText(authorEl.innerText));
  }

  return { byline, date };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function gangreyBodyBlocks(postEl: any): PortableTextBlock[] {
  const blocks: PortableTextBlock[] = [];
  const ps = postEl.querySelectorAll("p");
  const sources = ps.length ? ps : [postEl];
  for (const p of sources) {
    const paras = p.innerHTML.split(/(?:<br\s*\/?>\s*){2,}/i);
    for (let part of paras) {
      part = part.replace(/<br\s*\/?>/gi, " ");
      const text = cleanText(parse(`<x>${part}</x>`).innerText);
      if (text) blocks.push({ _type: "block", style: "normal", markDefs: [], children: [{ _type: "span", text, marks: [] }] } as unknown as PortableTextBlock);
    }
  }
  return blocks;
}

function parseDate(raw: string) {
  const d = new Date(raw);
  return isNaN(+d) ? new Date().toISOString() : d.toISOString();
}

export function parseGangreyPage(html: string, pageUrl: string, timestamp: string): GangreyStory | null {
  const root = parse(html);
  const idMatch = (() => { try { return new URL(pageUrl).pathname.match(/^\/(\d+)\/?$/)?.[1] ?? null; } catch { return null; } })();
  const posts = root.querySelectorAll("div.post");
  if (posts.length > 1 && !idMatch) return null;

  let post = null as ReturnType<typeof root.querySelector> | null;
  if (idMatch && posts.length) post = posts.find(p => p.querySelector(`a[href*="/${idMatch}"]`)) ?? null;
  if (!post) post = posts[0] ?? null;
  if (!post) return null;

  const headlineEl = post.querySelector("h2.design") || post.querySelector(".design") || post.querySelector("h2") || post.querySelector("h1");
  const headline = (headlineEl?.innerText ? cleanText(headlineEl.innerText) : "") ||
    cleanText((root.querySelector("title")?.innerText ?? "").replace(/\s*[|\-–—]\s*gangrey.*$/i, ""));

  const { byline, date } = extractMetaFields(post, root, timestamp);
  const subheadline = "";

  post.querySelectorAll("h2, h1, h4.byline, .byline, .entry-meta, .post-meta, script, style, .sharedaddy, #comments, .comments, .meta, .postmeta, .navigation").forEach(n => n.remove());
  const body = gangreyBodyBlocks(post);
  if (!headline || !body.length) return null;

  let slug = idMatch || "";
  if (!slug) {
    try {
      const parts = new URL(pageUrl).pathname.replace(/\/$/, "").split("/").filter(Boolean);
      slug = parts[parts.length - 1] || slugify(headline);
    } catch { slug = slugify(headline); }
  }
  slug = `gangrey-${slug}`.slice(0, 96);

  return { headline, byline, date, subheadline, slug, body };
}

export function toSanityDoc(s: GangreyStory) {
  const words = s.body.map(b => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ch = (b as any).children as { text?: string }[] | undefined;
    return ch?.map(c => c.text ?? "").join(" ") ?? "";
  }).join(" ").split(/\s+/).filter(Boolean).length;
  return {
    _id: `gangrey-import-${s.slug}`,
    _type: "post",
    section: "Gangrey Redux",
    status: "published",
    headline: s.headline,
    subheadline: s.subheadline,
    byline: s.byline,
    date: s.date,
    slug: { _type: "slug", current: s.slug },
    body: s.body,
    readingTime: Math.max(1, Math.round(words / 200)),
  };
}

export async function writeDocs(docs: unknown[]): Promise<number> {
  const token = process.env.SANITY_API_WRITE_TOKEN ?? process.env.SANITY_WRITE_TOKEN;
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production";
  if (!token || !projectId) throw new Error("Missing Sanity write token or project id in environment");
  const mutations = docs.map(doc => ({ createOrReplace: doc }));
  const res = await fetch(`https://${projectId}.api.sanity.io/v2024-01-01/data/mutate/${dataset}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ mutations }),
  });
  if (!res.ok) throw new Error(`Sanity mutate failed: ${await res.text()}`);
  const j = await res.json();
  return j?.results?.length ?? docs.length;
}

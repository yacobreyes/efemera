// Shared logic for importing the Gangrey archive from the Wayback Machine.
// Used by the admin-triggered API route (runs on Vercel, which has the Sanity
// write token + internet). Mirrors scripts/import-gangrey.mjs.
import { parse } from "node-html-parser";
import type { PortableTextBlock } from "@portabletext/types";

const CDX = "https://web.archive.org/cdx/search/cdx";
const WB = "https://web.archive.org/web";

export const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// Wayback rate-limits aggressively (429/503). Retry with exponential backoff.
async function fetchRetry(url: string, opts: RequestInit = {}, tries = 4): Promise<Response> {
  let delay = 1500;
  for (let i = 0; i < tries; i++) {
    const res = await fetch(url, opts);
    if (res.status !== 429 && res.status !== 503) return res;
    if (i < tries - 1) { await sleep(delay); delay *= 2; }
  }
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function gangreyBodyBlocks(postEl: any): PortableTextBlock[] {
  const blocks: PortableTextBlock[] = [];
  const ps = postEl.querySelectorAll("p");
  const sources = ps.length ? ps : [postEl];
  for (const p of sources) {
    const paras = p.innerHTML.split(/(?:<br\s*\/?>\s*){2,}/i);
    for (let part of paras) {
      part = part.replace(/<br\s*\/?>/gi, " ");
      const text = parse(`<x>${part}</x>`).innerText.replace(/\s+/g, " ").trim();
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
  const headline = headlineEl?.innerText?.trim() ||
    root.querySelector("title")?.innerText?.replace(/\s*[|\-–—]\s*gangrey.*$/i, "").trim() || "";

  const subheadline = (post.querySelector("h4.byline") || post.querySelector(".byline"))?.innerText?.trim() || "";
  const date = parseDate(`${timestamp.slice(0, 4)}-${timestamp.slice(4, 6)}-${timestamp.slice(6, 8)}`);

  post.querySelectorAll("h2, h1, h4.byline, .byline, script, style, .sharedaddy, #comments, .comments, .meta, .postmeta, .navigation").forEach(n => n.remove());
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

  return { headline, byline: "Gangrey", date, subheadline, slug, body };
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

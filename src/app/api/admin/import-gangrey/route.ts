import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import { listCandidates, fetchWayback, parseGangreyPage, toSanityDoc, writeDocs, sleep, type Candidate } from "@/lib/gangreyImport";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const TMP_CACHE = "/tmp/gangrey-cdx-cache.json";
const CACHE_TTL = 4 * 60 * 60 * 1000; // 4 hours

// Cache CDX index to /tmp so it survives lambda cold starts.
let _mem: { at: number; list: Candidate[] } | null = null;
async function getCandidates(): Promise<Candidate[]> {
  if (_mem && Date.now() - _mem.at < CACHE_TTL) return _mem.list;
  try {
    const raw = await fs.readFile(TMP_CACHE, "utf8");
    const { at, list } = JSON.parse(raw) as { at: number; list: Candidate[] };
    if (Date.now() - at < CACHE_TTL) { _mem = { at, list }; return list; }
  } catch { /* cache miss */ }
  const list = await listCandidates();
  const at = Date.now();
  _mem = { at, list };
  await fs.writeFile(TMP_CACHE, JSON.stringify({ at, list }), "utf8").catch(() => {});
  return list;
}

// Imports a batch of Gangrey stories from the Wayback Machine into Sanity.
// Batched via ?offset & ?limit so each call stays under the function timeout;
// the admin page loops through batches. Gated to the admin Google session.
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const offset = Math.max(0, parseInt(url.searchParams.get("offset") ?? "0", 10) || 0);
  const limit = Math.min(20, Math.max(1, parseInt(url.searchParams.get("limit") ?? "10", 10) || 10));
  const dry = url.searchParams.get("dry") === "1";

  let candidates;
  try {
    candidates = await getCandidates();
  } catch (e) {
    return NextResponse.json({ error: `Wayback CDX failed: ${String(e)}` }, { status: 502 });
  }

  const slice = candidates.slice(offset, offset + limit);
  const docs: unknown[] = [];
  const results: { headline?: string; slug?: string; skipped?: string; error?: string }[] = [];

  // Fetch 2 pages concurrently with a 500ms gap between waves — fast enough,
  // but gentle enough that Wayback doesn't drop connections.
  const CONCURRENCY = 2;
  for (let i = 0; i < slice.length; i += CONCURRENCY) {
    const wave = slice.slice(i, i + CONCURRENCY);
    const settled = await Promise.all(
      wave.map(c =>
        fetchWayback(c.timestamp, c.original)
          .then(html => ({ ok: true as const, html, c }))
          .catch(e => ({ ok: false as const, error: String(e), c }))
      )
    );
    for (const r of settled) {
      if (!r.ok) { results.push({ error: r.error }); continue; }
      try {
        const story = parseGangreyPage(r.html, r.c.original, r.c.timestamp);
        if (!story) { results.push({ skipped: r.c.original }); continue; }
        docs.push(toSanityDoc(story));
        results.push({ headline: story.headline, slug: story.slug });
      } catch (e) {
        results.push({ error: String(e) });
      }
    }
    if (i + CONCURRENCY < slice.length) await sleep(500);
  }

  let written = 0;
  if (!dry && docs.length) {
    try { written = await writeDocs(docs); }
    catch (e) { return NextResponse.json({ error: `Sanity write failed: ${String(e)}`, offset, results }, { status: 502 }); }
  }

  const nextOffset = offset + slice.length;
  return NextResponse.json({
    total: candidates.length,
    offset, limit,
    processed: slice.length,
    parsed: docs.length,
    written,
    nextOffset,
    done: nextOffset >= candidates.length,
    results,
  });
}

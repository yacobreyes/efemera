import { NextRequest, NextResponse } from "next/server";
import { isAuthed } from "@/lib/adminAuth";
import { listCandidates, fetchWayback, parseGangreyPage, toSanityDoc, writeDocs, sleep, type Candidate } from "@/lib/gangreyImport";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

// Cache the Wayback index across invocations on a warm lambda so we don't
// re-query CDX (and get 429'd) on every batch.
let _cache: { at: number; list: Candidate[] } | null = null;
async function getCandidates(): Promise<Candidate[]> {
  if (_cache && Date.now() - _cache.at < 20 * 60 * 1000) return _cache.list;
  const list = await listCandidates();
  _cache = { at: Date.now(), list };
  return list;
}

// Imports a batch of Gangrey stories from the Wayback Machine into Sanity.
// Batched via ?offset & ?limit so each call stays under the function timeout;
// the admin page loops through batches. Gated to the admin Google session.
export async function GET(req: NextRequest) {
  if (!(await isAuthed())) return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  const url = new URL(req.url);
  const offset = Math.max(0, parseInt(url.searchParams.get("offset") ?? "0", 10) || 0);
  const limit = Math.min(12, Math.max(1, parseInt(url.searchParams.get("limit") ?? "6", 10) || 6));
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

  for (const [i, c] of slice.entries()) {
    try {
      if (i > 0) await sleep(600); // be gentle with Wayback between page fetches
      const html = await fetchWayback(c.timestamp, c.original);
      const story = parseGangreyPage(html, c.original, c.timestamp);
      if (!story) { results.push({ skipped: c.original }); continue; }
      docs.push(toSanityDoc(story));
      results.push({ headline: story.headline, slug: story.slug });
    } catch (e) {
      results.push({ error: String(e) });
    }
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

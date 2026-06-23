import { NextRequest } from "next/server";
import { promises as fs } from "fs";
import { listCandidates, fetchWayback, parseGangreyPage, toSanityDoc, writeDocs, sleep, applyDateHints, type Candidate } from "@/lib/gangreyImport";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300; // Vercel Pro allows up to 300s

const TMP_CACHE = "/tmp/gangrey-cdx-cache.json";
const DATEMAP_CACHE = "/tmp/gangrey-datemap.json";
const CACHE_TTL = 4 * 60 * 60 * 1000;

let _mem: { at: number; list: Candidate[] } | null = null;

async function getCandidates(fresh = false): Promise<Candidate[]> {
  if (!fresh) {
    if (_mem && Date.now() - _mem.at < CACHE_TTL) return _mem.list;
    try {
      const raw = await fs.readFile(TMP_CACHE, "utf8");
      const { at, list } = JSON.parse(raw) as { at: number; list: Candidate[] };
      if (Date.now() - at < CACHE_TTL) { _mem = { at, list }; return list; }
    } catch { /* cache miss */ }
  }
  const list = await listCandidates();
  try {
    const raw = await fs.readFile(DATEMAP_CACHE, "utf8");
    const dateMap = new Map(Object.entries(JSON.parse(raw) as Record<string, string>));
    if (dateMap.size) applyDateHints(list, dateMap);
  } catch { /* no date map yet */ }
  const at = Date.now();
  _mem = { at, list };
  await fs.writeFile(TMP_CACHE, JSON.stringify({ at, list }), "utf8").catch(() => {});
  return list;
}

// Streaming import endpoint — processes all batches server-side and sends
// one NDJSON progress line per batch. The client reads the stream; no tab
// polling needed. Close the tab after kickoff and re-open to see status
// (progress is also written to /tmp so a status endpoint can read it).
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const dry = url.searchParams.get("dry") === "1";
  const fresh = url.searchParams.get("fresh") === "1";
  const batchSize = Math.min(20, Math.max(1, parseInt(url.searchParams.get("limit") ?? "10", 10) || 10));
  const CONCURRENCY = 2;

  const encoder = new TextEncoder();
  let controller: ReadableStreamDefaultController;

  function send(obj: object) {
    try { controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n")); } catch { /* stream closed */ }
  }

  const stream = new ReadableStream({
    async start(ctrl) {
      controller = ctrl;
      try {
        let candidates: Candidate[];
        try {
          candidates = await getCandidates(fresh);
        } catch (e) {
          send({ error: `CDX failed: ${String(e)}` });
          ctrl.close(); return;
        }

        const total = candidates.length;
        let offset = 0;
        let totalWritten = 0;
        let totalParsed = 0;

        send({ type: "start", total });

        while (offset < total) {
          if (req.signal.aborted) break;
          const slice = candidates.slice(offset, offset + batchSize);
          const docs: unknown[] = [];
          const results: { headline?: string; slug?: string; skipped?: string; error?: string }[] = [];

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
                const story = parseGangreyPage(r.html, r.c.original, r.c.timestamp, r.c.dateHint);
                if (!story) { results.push({ skipped: r.c.original }); continue; }
                docs.push(toSanityDoc(story));
                results.push({ headline: story.headline, slug: story.slug });
              } catch (e) { results.push({ error: String(e) }); }
            }
            if (i + CONCURRENCY < slice.length) await sleep(500);
          }

          let written = 0;
          if (!dry && docs.length) {
            try { written = await writeDocs(docs); }
            catch (e) { send({ type: "writeError", error: String(e), offset }); }
          }

          totalParsed += docs.length;
          totalWritten += written;
          offset += slice.length;

          send({
            type: "batch", offset, total, written, totalWritten, totalParsed,
            done: offset >= total, results,
          });

          // Write progress to /tmp so a status poll can read it
          await fs.writeFile("/tmp/gangrey-import-progress.json",
            JSON.stringify({ offset, total, totalWritten, totalParsed, done: offset >= total, updatedAt: Date.now() }),
            "utf8"
          ).catch(() => {});

          if (offset >= total) break;
          await sleep(200);
        }

        send({ type: "done", total, totalWritten, totalParsed });
      } catch (e) {
        send({ type: "fatalError", error: String(e) });
      } finally {
        ctrl.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
    },
  });
}

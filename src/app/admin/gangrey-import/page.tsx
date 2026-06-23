"use client";

import { useEffect, useRef, useState } from "react";

type BatchResult = {
  total: number; offset: number; nextOffset: number; processed: number;
  parsed: number; written: number; done: boolean;
  results: { headline?: string; slug?: string; skipped?: string; error?: string }[];
  error?: string;
};

export default function GangreyImportPage() {
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [total, setTotal] = useState(0);
  const [processed, setProcessed] = useState(0);
  const [written, setWritten] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const [dry, setDry] = useState(false);
  const [resumeOffset, setResumeOffset] = useState<number | null>(null);
  const [hasRun, setHasRun] = useState(false);
  const [savedCount, setSavedCount] = useState<number | null>(null);
  const [deduping, setDeduping] = useState(false);
  const [dedupResult, setDedupResult] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/import-gangrey/count")
      .then(r => r.json())
      .then(d => { if (typeof d.count === "number") setSavedCount(d.count); })
      .catch(() => {});
  }, []);

  const stopRef = useRef(false);

  function append(line: string) { setLog(l => [line, ...l].slice(0, 400)); }

  async function run(startOffset = 0) {
    setRunning(true); setDone(false); stopRef.current = false; setHasRun(true);
    if (startOffset === 0) { setProcessed(0); setWritten(0); setLog([]); }
    setResumeOffset(null);
    let offset = startOffset;
    let totalWritten = startOffset === 0 ? 0 : written;
    let retries = 0;
    const MAX_RETRIES = 5;

    try {
      while (!stopRef.current) {
        let res: Response;
        let data: BatchResult;
        try {
          res = await fetch(`/api/admin/import-gangrey?offset=${offset}&limit=10${dry ? "&dry=1" : ""}`);
          data = await res.json();
        } catch (e) {
          // Network blip — auto-retry up to MAX_RETRIES with backoff
          if (retries < MAX_RETRIES) {
            retries++;
            const wait = retries * 3000;
            append(`⏳ Network error, retrying in ${wait / 1000}s… (${retries}/${MAX_RETRIES})`);
            await new Promise(r => setTimeout(r, wait));
            continue;
          }
          append(`❌ ${String(e)}`);
          setResumeOffset(offset);
          break;
        }

        if (!res.ok || data.error) {
          if (retries < MAX_RETRIES) {
            retries++;
            const wait = retries * 3000;
            append(`⏳ Error: ${data.error ?? res.statusText} — retrying in ${wait / 1000}s… (${retries}/${MAX_RETRIES})`);
            await new Promise(r => setTimeout(r, wait));
            continue;
          }
          append(`❌ ${data.error ?? res.statusText}`);
          setResumeOffset(offset);
          break;
        }

        retries = 0; // reset on success
        setTotal(data.total);
        setProcessed(p => p + data.processed);
        totalWritten += data.written;
        setWritten(totalWritten);
        for (const r of data.results) {
          if (r.headline) append(`✅ ${r.headline}`);
          else if (r.skipped) append(`· skipped`);
          else if (r.error) append(`⚠️ ${r.error}`);
        }
        offset = data.nextOffset;
        if (data.done) {
          setDone(true); setResumeOffset(null);
          append(`— Finished. ${totalWritten} stories imported. —`);
          // Refresh the saved count
          fetch("/api/admin/import-gangrey/count").then(r => r.json())
            .then(d => { if (typeof d.count === "number") setSavedCount(d.count); }).catch(() => {});
          break;
        }
        await new Promise(r => setTimeout(r, 400));
      }
      if (stopRef.current) setResumeOffset(offset);
    } finally {
      setRunning(false);
    }
  }

  async function runDedup() {
    setDeduping(true); setDedupResult(null);
    try {
      const res = await fetch("/api/admin/import-gangrey/dedup", { method: "POST" });
      const data = await res.json();
      if (data.error) { setDedupResult(`❌ ${data.error}`); return; }
      setDedupResult(`✅ Deleted ${data.deleted} duplicate${data.deleted !== 1 ? "s" : ""} — ${data.kept} stories remain.`);
      fetch("/api/admin/import-gangrey/count").then(r => r.json())
        .then(d => { if (typeof d.count === "number") setSavedCount(d.count); }).catch(() => {});
    } catch (e) {
      setDedupResult(`❌ ${String(e)}`);
    } finally {
      setDeduping(false);
    }
  }

  const pct = total ? Math.round((processed / total) * 100) : 0;
  const btnStyle = (primary: boolean): React.CSSProperties => ({
    background: primary ? "#8B0000" : "#fff",
    color: primary ? "#fff" : "#8B0000",
    border: primary ? "none" : "1px solid #8B0000",
    borderRadius: 6, padding: "12px 22px", fontWeight: 700, fontSize: 15,
    cursor: running ? "default" : "pointer", opacity: running ? 0.6 : 1,
  });

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "3rem 1.5rem", fontFamily: "Inter, system-ui, sans-serif", color: "#1c2938" }}>
      <h1 style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: 40, margin: "0 0 4px" }}>Gangrey Archive Import</h1>
      {savedCount !== null && (
        <p style={{ fontFamily: "Inter, system-ui, sans-serif", fontSize: 13, fontWeight: 700, color: "#1a7f37", margin: "0 0 8px" }}>
          {savedCount} stories currently in Sanity
        </p>
      )}
      <p style={{ color: "#526270", margin: "0 0 24px" }}>
        Pulls every story from the Wayback Machine snapshot of gangrey.com and imports it as a
        Gangrey&nbsp;Redux post. Runs in batches — keep this tab open until it finishes.
        Auto-retries on errors.
      </p>

      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 20, flexWrap: "wrap" }}>
        <button onClick={() => run(0)} disabled={running} style={btnStyle(true)}>
          {running ? "Importing…" : dry ? "Test run (no writes)" : "Start import"}
        </button>
        {hasRun && resumeOffset !== null && !running && !done && (
          <button onClick={() => run(resumeOffset)} style={btnStyle(false)}>
            Resume from {resumeOffset}
          </button>
        )}
        {running && (
          <button onClick={() => { stopRef.current = true; }} style={btnStyle(false)}>
            Stop
          </button>
        )}
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, color: "#526270" }}>
          <input type="checkbox" checked={dry} disabled={running} onChange={e => setDry(e.target.checked)} />
          Test run (parse only, don't save)
        </label>
      </div>

      {total > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ height: 10, background: "#e1e8ed", borderRadius: 6, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pct}%`, background: done ? "#1a7f37" : "#8B0000", transition: "width .3s" }} />
          </div>
          <div style={{ fontSize: 13, color: "#526270", marginTop: 6 }}>
            {processed} / {total} processed · {written} imported {done ? "· done ✅" : ""}
          </div>
        </div>
      )}

      <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid #e1e8ed" }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 8px" }}>Clean up duplicates</h2>
        <p style={{ fontSize: 13, color: "#526270", margin: "0 0 12px" }}>
          Finds stories with the same headline in Sanity and deletes the lower-quality copy (keeps the one with a byline and a path-based slug).
        </p>
        <button onClick={runDedup} disabled={deduping || running} style={{ ...btnStyle(false), fontSize: 14 }}>
          {deduping ? "Deleting duplicates…" : "Delete duplicates from Sanity"}
        </button>
        {dedupResult && <p style={{ marginTop: 10, fontSize: 13, fontWeight: 600 }}>{dedupResult}</p>}
      </div>

      <div style={{ marginTop: 24, background: "#0d1117", color: "#c9d1d9", borderRadius: 8, padding: 16, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12.5, lineHeight: 1.6, maxHeight: 420, overflowY: "auto", whiteSpace: "pre-wrap" }}>
        {log.length === 0 ? <span style={{ color: "#6e7681" }}>Log will appear here…</span> : log.map((l, i) => <div key={i}>{l}</div>)}
      </div>
    </div>
  );
}

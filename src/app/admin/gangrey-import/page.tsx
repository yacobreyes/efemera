"use client";

import { useEffect, useRef, useState } from "react";

type Progress = { offset: number; total: number; totalWritten: number; totalParsed: number; done: boolean; updatedAt?: number };

export default function GangreyImportPage() {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<Progress>({ offset: 0, total: 0, totalWritten: 0, totalParsed: 0, done: false });
  const [log, setLog] = useState<string[]>([]);
  const [dry, setDry] = useState(false);
  const [savedCount, setSavedCount] = useState<number | null>(null);
  const [deduping, setDeduping] = useState(false);
  const [dedupResult, setDedupResult] = useState<string | null>(null);
  const [buildingMap, setBuildingMap] = useState(false);
  const [mapResult, setMapResult] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  function append(line: string) {
    setLog(l => [line, ...l].slice(0, 600));
  }

  useEffect(() => {
    fetch("/api/admin/import-gangrey/count")
      .then(r => r.json()).then(d => { if (typeof d.count === "number") setSavedCount(d.count); }).catch(() => {});
    // Check if an import was in progress before page load
    fetch("/api/admin/import-gangrey/status")
      .then(r => r.json()).then((d: Progress) => { if (d.total > 0) setProgress(d); }).catch(() => {});
  }, []);

  async function startImport(fresh = false) {
    if (running) return;
    abortRef.current = new AbortController();
    setRunning(true);
    setProgress({ offset: 0, total: 0, totalWritten: 0, totalParsed: 0, done: false });
    setLog([]);

    try {
      const res = await fetch(
        `/api/admin/import-gangrey/stream?limit=10${dry ? "&dry=1" : ""}${fresh ? "&fresh=1" : ""}`,
        { signal: abortRef.current.signal }
      );
      if (!res.body) { append("❌ No response body"); return; }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const msg = JSON.parse(line);
            if (msg.type === "start") {
              append(`— Starting: ${msg.total} candidates —`);
            } else if (msg.type === "batch") {
              setProgress({ offset: msg.offset, total: msg.total, totalWritten: msg.totalWritten, totalParsed: msg.totalParsed, done: msg.done });
              for (const r of (msg.results ?? [])) {
                if (r.headline) append(`✅ ${r.headline}`);
                else if (r.error) append(`⚠️ ${r.error.slice(0, 80)}`);
              }
            } else if (msg.type === "done") {
              append(`— Done. ${msg.totalWritten} stories imported. —`);
              fetch("/api/admin/import-gangrey/count").then(r => r.json())
                .then((d: { count?: number }) => { if (typeof d.count === "number") setSavedCount(d.count); }).catch(() => {});
            } else if (msg.type === "writeError") {
              append(`⚠️ Write error at offset ${msg.offset}: ${msg.error}`);
            } else if (msg.type === "fatalError") {
              append(`❌ Fatal: ${msg.error}`);
            } else if (msg.error) {
              append(`❌ ${msg.error}`);
            }
          } catch { /* malformed line */ }
        }
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.name === "AbortError") {
        append("— Stopped. —");
      } else {
        append(`❌ ${String(e)}`);
      }
    } finally {
      setRunning(false);
    }
  }

  function stop() {
    abortRef.current?.abort();
  }

  async function runDedup() {
    setDeduping(true); setDedupResult(null);
    try {
      const res = await fetch("/api/admin/import-gangrey/dedup", { method: "POST" });
      const data = await res.json();
      if (data.error) { setDedupResult(`❌ ${data.error}`); return; }
      setDedupResult(`✅ Deleted ${data.deleted} duplicate${data.deleted !== 1 ? "s" : ""} — ${data.kept} remain.`);
      fetch("/api/admin/import-gangrey/count").then(r => r.json())
        .then((d: { count?: number }) => { if (typeof d.count === "number") setSavedCount(d.count); }).catch(() => {});
    } catch (e) {
      setDedupResult(`❌ ${String(e)}`);
    } finally {
      setDeduping(false);
    }
  }

  async function buildMap() {
    setBuildingMap(true); setMapResult(null);
    let fromYear: number | null = 2005;
    let toYear: number | null = 2006;
    try {
      while (fromYear !== null) {
        let data: { added: number; totalMapped: number; done: boolean; nextFromYear: number | null; nextToYear: number | null; error?: string };
        try {
          const res = await fetch(`/api/admin/import-gangrey?buildmap=1&fromYear=${fromYear}&toYear=${toYear}`);
          data = await res.json();
        } catch {
          setMapResult(`⏳ Network blip on ${fromYear}–${toYear}, retrying…`);
          await new Promise(r => setTimeout(r, 3000));
          continue;
        }
        if (data.error) { setMapResult(`❌ ${data.error}`); break; }
        setMapResult(`Mapped ${fromYear}–${toYear} · ${data.totalMapped} dates so far…`);
        if (data.done) {
          setMapResult(`✅ Date map complete — ${data.totalMapped} stories mapped. Run a fresh import to apply dates.`);
          break;
        }
        fromYear = data.nextFromYear;
        toYear = data.nextToYear;
        await new Promise(r => setTimeout(r, 300));
      }
    } finally {
      setBuildingMap(false);
    }
  }

  const pct = progress.total ? Math.round((progress.offset / progress.total) * 100) : 0;

  const btn = (primary: boolean, disabled = false): React.CSSProperties => ({
    background: primary ? "#8B0000" : "#fff",
    color: primary ? "#fff" : "#8B0000",
    border: primary ? "none" : "1px solid #8B0000",
    borderRadius: 6, padding: "12px 22px", fontWeight: 700, fontSize: 15,
    cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.55 : 1,
  });

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "3rem 1.5rem", fontFamily: "Inter, system-ui, sans-serif", color: "#1c2938" }}>
      <h1 style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: 40, margin: "0 0 4px" }}>Gangrey Archive Import</h1>
      {savedCount !== null && (
        <p style={{ fontSize: 13, fontWeight: 700, color: "#1a7f37", margin: "0 0 8px" }}>
          {savedCount} stories currently in Sanity
        </p>
      )}
      <p style={{ color: "#526270", margin: "0 0 24px" }}>
        Pulls every story from the Wayback Machine and imports it as a Gangrey Redux post.
        Runs entirely server-side — you can close this tab and come back to check progress.
      </p>

      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 20, flexWrap: "wrap" }}>
        <button onClick={() => startImport(false)} disabled={running} style={btn(true, running)}>
          {running ? "Importing…" : dry ? "Test run (no writes)" : "Start import"}
        </button>
        <button onClick={() => startImport(true)} disabled={running} style={{ ...btn(false, running), fontSize: 14 }}>
          Fresh import (ignore cache)
        </button>
        {running && (
          <button onClick={stop} style={btn(false)}>Stop</button>
        )}
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, color: "#526270" }}>
          <input type="checkbox" checked={dry} disabled={running} onChange={e => setDry(e.target.checked)} />
          Test run (parse only, don't save)
        </label>
      </div>

      {progress.total > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ height: 10, background: "#e1e8ed", borderRadius: 6, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pct}%`, background: progress.done ? "#1a7f37" : "#8B0000", transition: "width .3s" }} />
          </div>
          <div style={{ fontSize: 13, color: "#526270", marginTop: 6 }}>
            {progress.offset} / {progress.total} processed · {progress.totalWritten} imported
            {progress.done ? " · done ✅" : ""}
          </div>
        </div>
      )}

      <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid #e1e8ed" }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 8px" }}>Fix story dates</h2>
        <p style={{ fontSize: 13, color: "#526270", margin: "0 0 12px" }}>
          Cross-references Gangrey&apos;s monthly archive pages for accurate publication dates.
          Run this first, then do a fresh import.
        </p>
        <button onClick={buildMap} disabled={buildingMap || running} style={{ ...btn(false, buildingMap || running), fontSize: 14 }}>
          {buildingMap ? "Building date map…" : "Build date map"}
        </button>
        {mapResult && <p style={{ marginTop: 10, fontSize: 13, fontWeight: 600 }}>{mapResult}</p>}
      </div>

      <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid #e1e8ed" }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 8px" }}>Clean up duplicates</h2>
        <p style={{ fontSize: 13, color: "#526270", margin: "0 0 12px" }}>
          Finds stories with the same headline and deletes the lower-quality copy.
        </p>
        <button onClick={runDedup} disabled={deduping || running} style={{ ...btn(false, deduping || running), fontSize: 14 }}>
          {deduping ? "Deleting duplicates…" : "Delete duplicates from Sanity"}
        </button>
        {dedupResult && <p style={{ marginTop: 10, fontSize: 13, fontWeight: 600 }}>{dedupResult}</p>}
      </div>

      <div ref={logRef} style={{ marginTop: 24, background: "#0d1117", color: "#c9d1d9", borderRadius: 8, padding: 16, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12.5, lineHeight: 1.6, maxHeight: 420, overflowY: "auto", whiteSpace: "pre-wrap" }}>
        {log.length === 0
          ? <span style={{ color: "#6e7681" }}>Log will appear here…</span>
          : log.map((l, i) => <div key={i}>{l}</div>)
        }
      </div>
    </div>
  );
}

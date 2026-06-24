"use client";

import { useState, useMemo } from "react";

const LETTERS = ["-", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")] as const;

type Author = { name: string; count: number };

export default function AuthorsClient({ authors }: { authors: Author[] }) {
  const [letter, setLetter] = useState<string>("-");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return authors.filter(a => {
      if (q) return a.name.toLowerCase().includes(q);
      if (letter === "-") return true;
      const last = a.name.trim().split(/\s+/).at(-1) ?? "";
      return last[0]?.toUpperCase() === letter;
    });
  }, [authors, letter, query]);

  // Which letters have authors
  const available = useMemo(() => {
    const set = new Set<string>();
    for (const a of authors) {
      const last = a.name.trim().split(/\s+/).at(-1) ?? "";
      if (last[0]) set.add(last[0].toUpperCase());
    }
    return set;
  }, [authors]);

  return (
    <div style={{ fontFamily: "Inter, system-ui, sans-serif", color: "#171412" }}>
      <style>{`
        .au-letter {
          background: none;
          border: none;
          cursor: pointer;
          font-family: inherit;
          font-size: 14px;
          font-weight: 600;
          color: #cfc3b3;
          padding: 2px 4px;
          transition: color .12s;
          letter-spacing: .04em;
        }
        .au-letter.active { color: #171412; text-decoration: underline; text-underline-offset: 3px; }
        .au-letter.has:not(.active) { color: #171412; }
        .au-letter:hover { color: #8e0d0d; }
        .au-grid { columns: 4; column-gap: 40px; margin-top: 40px; }
        .au-name {
          font-family: Georgia, serif;
          font-size: 16px;
          line-height: 1.5;
          color: #171412;
          margin-bottom: 10px;
          break-inside: avoid;
          cursor: default;
        }
        @media (max-width: 900px) { .au-grid { columns: 3; } }
        @media (max-width: 640px) { .au-grid { columns: 2; } }
        @media (max-width: 420px) { .au-grid { columns: 1; } }
      `}</style>

      {/* Header row */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 32, gap: 20, flexWrap: "wrap" }}>
        <h1 style={{ fontFamily: "Georgia, serif", fontSize: "clamp(40px, 6vw, 72px)", fontWeight: 400, margin: 0, lineHeight: 1 }}>Authors</h1>
        <input
          type="search"
          placeholder="Search Authors"
          value={query}
          onChange={e => { setQuery(e.target.value); setLetter("-"); }}
          style={{
            border: "1px solid #cfc3b3",
            borderRadius: 4,
            padding: "8px 14px",
            fontFamily: "inherit",
            fontSize: 14,
            color: "#171412",
            background: "#fbf6ee",
            outline: "none",
            width: 200,
            alignSelf: "center",
          }}
        />
      </div>

      <hr style={{ border: "none", borderTop: "1px solid #cfc3b3", margin: "0 0 16px" }} />

      {/* Alphabet filter */}
      <div style={{ marginBottom: 8 }}>
        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".2em", textTransform: "uppercase", color: "#8e0d0d", marginRight: 16 }}>Filter by Last Name</span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 2, marginTop: 8 }}>
          {LETTERS.map(l => (
            <button
              key={l}
              className={`au-letter${letter === l && !query ? " active" : ""}${available.has(l) || l === "-" ? " has" : ""}`}
              onClick={() => { setLetter(l); setQuery(""); }}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <hr style={{ border: "none", borderTop: "1px solid #cfc3b3", margin: "16px 0 0" }} />

      {/* Author grid */}
      {filtered.length === 0 ? (
        <p style={{ fontFamily: "Georgia, serif", fontStyle: "italic", color: "#8a7f6f", marginTop: 40, fontSize: 18 }}>No authors found.</p>
      ) : (
        <div className="au-grid">
          {filtered.map(a => (
            <div key={a.name} className="au-name">{a.name}</div>
          ))}
        </div>
      )}
    </div>
  );
}

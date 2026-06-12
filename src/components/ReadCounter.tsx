"use client";

import { useEffect, useState } from "react";

export default function ReadCounter({ slug }: { slug: string }) {
  const [count, setCount] = useState<number>(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    fetch("/api/reads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug }),
    })
      .then(r => r.json())
      .then(d => { setCount(d.count ?? 0); setReady(true); })
      .catch(() => setReady(true));
  }, [slug]);

  const digits = ready ? count.toLocaleString("en-US").padStart(5, "0") : "00000";

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", fontFamily: "'Courier New', Courier, monospace" }}>
      <span style={{ fontSize: "0.65rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "#8B0000", fontWeight: 700 }}>Reads</span>
      <span style={{ display: "inline-flex", opacity: ready ? 1 : 0.3, transition: "opacity 0.4s ease" }}>
        {digits.split("").map((ch, i) => (
          <span key={i} style={{
            display: "inline-block",
            width: "1.15em",
            textAlign: "center",
            fontSize: "0.82rem",
            fontWeight: 700,
            color: "#1c2938",
            background: "#f0f3f4",
            border: "1px solid #d0d7de",
            borderRight: i < 4 ? "none" : "1px solid #d0d7de",
            lineHeight: "1.6",
            letterSpacing: 0,
          }}>{ch}</span>
        ))}
      </span>
    </div>
  );
}

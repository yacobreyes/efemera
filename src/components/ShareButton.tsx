"use client";

import { useState } from "react";

export default function ShareButton({ slug, headline }: { slug: string; headline: string }) {
  const [copied, setCopied] = useState(false);

  function share() {
    const url = `${window.location.origin}/stories/${slug}`;
    if (navigator.share) {
      navigator.share({ title: headline, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  }

  return (
    <button onClick={share} style={{ display: "flex", alignItems: "center", gap: "0.35rem", background: "none", border: "none", cursor: "pointer", padding: 0, color: copied ? "#990000" : "#000000" }}>
      {copied ? (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      ) : (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>
        </svg>
      )}
      <span style={{ fontFamily: "var(--font-subhead)", fontSize: "0.8rem" }}>{copied ? "Copied!" : "Share"}</span>
    </button>
  );
}

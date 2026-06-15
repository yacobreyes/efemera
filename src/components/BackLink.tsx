"use client";

import { useRouter } from "next/navigation";

export default function BackLink({ section, tab }: { section: string; tab: string }) {
  const router = useRouter();
  return (
    <button
      onClick={() => router.back()}
      style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", background: "none", border: "none", cursor: "pointer", fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: "0.75rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "#8B0000", padding: 0, marginBottom: "0.75rem" }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
      {section}
    </button>
  );
}

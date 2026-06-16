import Link from "next/link";

export default function BackLink({ section }: { section: string; tab: string }) {
  return (
    <Link
      href="/"
      style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: "0.75rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "#8B0000", textDecoration: "none", marginBottom: "0.75rem" }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
      {section}
    </Link>
  );
}

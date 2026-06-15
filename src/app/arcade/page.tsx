import type { Metadata } from "next";
import Link from "next/link";
import FlappyChoopyClient from "@/components/FlappyChoopyClient";

export const metadata: Metadata = {
  title: "Choopy's Arcade - Efemera",
  description: "Help Choopy fly through Tampa. An unlockable mini-game on Efemera.",
  robots: { index: false },
};

export default function ArcadePage() {
  return (
    <>
      <head>
        <link rel="preload" as="image" href="/tampa-skyline.webp" />
        <link rel="preload" as="image" href="/choopy-fly.webp" />
        <link rel="preload" as="image" href="/mayfly-icon.webp" />
        <link rel="preload" as="fetch" href="/teenage-dirtbag-chiptune.wav" crossOrigin="anonymous" />
      </head>
      <style>{`html, body { background: #000 !important; }`}</style>
    <main style={{
      minHeight: "100dvh",
      background: "#000",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "1rem",
    }}>
      <div style={{ width: "100%", maxWidth: 480 }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          marginBottom: "0.75rem",
          padding: "0 0.25rem",
        }}>
          <span style={{
            fontFamily: "monospace", fontWeight: 700, fontSize: "0.75rem",
            letterSpacing: "0.18em", textTransform: "uppercase",
            color: "#FFD700",
            textShadow: "0 0 8px rgba(255,215,0,0.5)",
          }}>
            Choopy&apos;s Arcade
          </span>
          <Link
            href="/"
            style={{
              fontFamily: "monospace", fontSize: "0.65rem",
              letterSpacing: "0.1em", color: "rgba(255,255,255,0.35)",
              textDecoration: "none", textTransform: "uppercase",
            }}
          >
            ← Back to Efemera
          </Link>
        </div>

        {/* Game */}
        <div style={{
          borderRadius: 6,
          overflow: "hidden",
          border: "1px solid rgba(255,215,0,0.2)",
          boxShadow: "0 0 40px rgba(255,215,0,0.08)",
        }}>
          <FlappyChoopyClient />
        </div>
      </div>
    </main>
    </>
  );
}

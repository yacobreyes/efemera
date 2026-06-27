import { CRIMSON } from "@/lib/palette";

// Shown instantly on navigation to the dashboard so the transition feels
// immediate while the post list renders, instead of a frozen screen.
export default function Loading() {
  return (
    <div style={{
      position: "fixed", inset: 0, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", gap: "1.1rem",
      background: "#f5f8fa", zIndex: 50,
    }}>
      <div style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "1.5rem", fontWeight: 900, letterSpacing: "-0.01em" }}>
        <span style={{ color: CRIMSON }}>Flat</span><span style={{ color: "#000000" }}>Plan</span>
      </div>
      <div style={{ width: 140, height: 3, borderRadius: 3, background: "#e3e8ec", overflow: "hidden" }}>
        <div style={{ width: "40%", height: "100%", borderRadius: 3, background: CRIMSON, animation: "fp-slide 1s ease-in-out infinite" }} />
      </div>
      <style>{`
        @keyframes fp-slide {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(350%); }
        }
      `}</style>
    </div>
  );
}

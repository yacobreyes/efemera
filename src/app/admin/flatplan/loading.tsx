// Shown instantly while the dashboard server component awaits its Sanity
// fetch, so login lands on a branded spinner instead of a blank white screen.
export default function Loading() {
  return (
    <div style={{ position: "fixed", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1.25rem", background: "#f5f8fa" }}>
      <span style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif", fontSize: "1.6rem", fontWeight: 900, letterSpacing: "-0.02em" }}>
        <span style={{ color: "#490000" }}>Flat</span><span style={{ color: "#000000" }}>Plan</span>
      </span>
      <div style={{ width: 28, height: 28, border: "3px solid #d8dde1", borderTopColor: "#490000", borderRadius: "50%", animation: "fp-spin 0.7s linear infinite" }} />
      <style>{`@keyframes fp-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

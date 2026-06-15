export default function StoryLoading() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#f5f8fa" }}>
      <header style={{ position: "sticky", top: 0, zIndex: 10, background: "#8B0000", padding: "0.6rem 1.5rem", boxShadow: "0 2px 6px rgba(0,0,0,0.3)", height: 60, boxSizing: "border-box" }} />
      <div style={{ maxWidth: 600, margin: "2rem auto 0", width: "calc(100% - 2rem)", background: "white", border: "1px solid #e1e8ed", borderRadius: 4, padding: "2rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div style={{ height: 12, width: 100, background: "#f0e8e8", borderRadius: 4 }} />
        <div style={{ height: 32, width: "80%", background: "#f5f5f5", borderRadius: 4 }} />
        <div style={{ height: 18, width: "60%", background: "#f5f5f5", borderRadius: 4 }} />
        <div style={{ height: 1, background: "#e1e8ed", margin: "0.5rem 0" }} />
        {[100, 95, 98, 90, 85].map((w, i) => (
          <div key={i} style={{ height: 14, width: `${w}%`, background: "#f5f5f5", borderRadius: 4 }} />
        ))}
      </div>
    </div>
  );
}

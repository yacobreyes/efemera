const BORDER = "#e1e8ed";

// Shown the instant navigation starts, before the server component's Sanity
// fetch resolves — avoids a blank white flash while the story loads.
export default function Loading() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "white" }}>
      <div style={{ height: 52, borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }} />
      <div style={{ flex: 1, background: "#f5f8fa" }} />
    </div>
  );
}

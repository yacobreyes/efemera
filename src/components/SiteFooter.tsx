export default function SiteFooter() {
  return (
    <footer style={{
      background: "#8B0000",
      marginTop: "auto",
      padding: "2.5rem 1.5rem 2rem",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "1rem",
    }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/wordmark.png" alt="efemera" style={{ width: "clamp(100px, 18vw, 180px)", height: "auto", opacity: 0.9 }} />

      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.7rem", color: "rgba(255,255,255,0.35)", margin: 0, letterSpacing: "0.05em" }}>
        © {new Date().getFullYear()} Efemera · Yacob Reyes
      </p>
    </footer>
  );
}

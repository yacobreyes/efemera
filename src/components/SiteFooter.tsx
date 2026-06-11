export default function SiteFooter() {
  return (
    <footer style={{
      background: "#8B0000",
      marginTop: "3rem",
      padding: "2.5rem 1.5rem 2rem",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "1rem",
    }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/wordmark.png" alt="efemera" style={{ width: "clamp(160px, 30vw, 320px)", height: "auto", opacity: 0.9 }} />

      <p style={{ fontFamily: "Arial, sans-serif", fontSize: "0.7rem", color: "rgba(255,255,255,0.35)", margin: 0, letterSpacing: "0.05em" }}>
        © {new Date().getFullYear()} Efemera · Yacob Reyes
      </p>
    </footer>
  );
}

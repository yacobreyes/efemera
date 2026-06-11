export default function SiteFooter() {
  return (
    <footer style={{
      background: "#8B0000",
      marginTop: "3rem",
      padding: "2.5rem 1.5rem 2rem",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "1.2rem",
    }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/Masthead.png" alt="efemera" style={{ height: 32, width: "auto", opacity: 0.9 }} />

      <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "0.85rem", color: "rgba(255,255,255,0.6)", margin: 0, letterSpacing: "0.05em", textAlign: "center", maxWidth: 400 }}>
        Life, in brief. A literary publication devoted to the overlooked and the ephemeral.
      </p>

      <div style={{ display: "flex", gap: "2rem" }}>
        {["Home", "About", "Micro-Memoirs", "Narratives"].map(s => (
          <a key={s} href={s === "Home" ? "/" : "#"} style={{ fontFamily: "'Bodoni Moda', serif", fontSize: "0.75rem", fontWeight: 700, color: "rgba(255,255,255,0.6)", textDecoration: "none", letterSpacing: "0.05em" }}>
            {s}
          </a>
        ))}
      </div>

      <p style={{ fontFamily: "Arial, sans-serif", fontSize: "0.7rem", color: "rgba(255,255,255,0.35)", margin: 0, letterSpacing: "0.05em" }}>
        © {new Date().getFullYear()} Efemera · Yacob Reyes
      </p>
    </footer>
  );
}

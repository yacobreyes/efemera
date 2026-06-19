import Link from "next/link";

export default function MagFooter() {
  return (
    <footer className="mag-footer">
      <style>{`
        .mag-footer {
          padding: 46px 7vw 34px;
          background: #fbf6ee;
          border-top: 1px solid #cfc3b3;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }
        .mag-footer-fly { margin-bottom: 20px; }
        .mag-footer-fly img { height: 46px; width: auto; opacity: .8; display: block; }
        .mag-footer-links {
          display: flex;
          gap: 34px;
          justify-content: center;
          flex-wrap: wrap;
          font-family: Inter, system-ui, sans-serif;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: .2em;
          text-transform: uppercase;
          color: #171412;
        }
        .mag-footer-links a { color: inherit; text-decoration: none; }
        .mag-footer-copy {
          margin-top: 26px;
          font-family: "Cormorant Garamond", Georgia, serif;
          font-size: 16px;
          color: #171412;
        }
        @media (max-width: 900px) {
          .mag-footer { padding: 36px 24px 28px; }
          .mag-footer-links { gap: 24px; }
        }
      `}</style>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <div className="mag-footer-fly"><img src="/Black Mayfly.png" alt="" /></div>
      <nav className="mag-footer-links">
        <Link href="/?tab=About">Masthead</Link>
        <a href="mailto:hello@efemera.co">Submit</a>
        <Link href="/#subscribe">Subscribe</Link>
      </nav>
      <p className="mag-footer-copy">© 2026 Efemera. A Literary Collective by Yacob Reyes.</p>
    </footer>
  );
}

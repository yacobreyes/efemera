import Link from "next/link";
import SubscribeButton from "@/components/SubscribeButton";

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
        .mag-footer-fly img { height: 46px; width: auto; display: block; filter: brightness(0); }
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
        .mag-footer-links button { font: inherit; letter-spacing: inherit; text-transform: inherit; background: none; border: none; padding: 0; color: inherit; cursor: pointer; }
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
        <Link href="/about">Masthead</Link>
        <a href="mailto:yacob@efemera.org">Submit</a>
        <SubscribeButton>Subscribe</SubscribeButton>
      </nav>
      <p className="mag-footer-copy">© 2026 Efemera | A Journal of Creative Nonfiction.</p>
    </footer>
  );
}

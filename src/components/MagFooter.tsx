import Link from "next/link";
import SubscribeButton from "@/components/SubscribeButton";

export default function MagFooter() {
  return (
    <footer className="mag-footer">
      <style>{`
        .mag-footer {
          padding: 46px 7vw 34px;
          background: #ffffff;
          border-top: 1px solid #b8b8ba;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }
        .mag-footer-links {
          display: flex;
          gap: 34px;
          justify-content: center;
          flex-wrap: wrap;
          font-family: var(--font-subhead);
          font-size: 12px;
          font-weight: 800;
          letter-spacing: .2em;
          text-transform: uppercase;
          color: #000000;
        }
        .mag-footer-links a { color: inherit; text-decoration: none; }
        .mag-footer-links button { font: inherit; letter-spacing: inherit; text-transform: inherit; background: none; border: none; padding: 0; color: inherit; cursor: pointer; }
        .mag-footer-copy {
          margin-top: 26px;
          font-family: var(--font-headline);
          font-size: 16px;
          color: #000000;
        }
        @media (max-width: 900px) {
          .mag-footer { padding: 36px 24px 28px; }
          .mag-footer-links { gap: 24px; }
        }
      `}</style>
      <nav className="mag-footer-links">
        <Link href="/authors">Authors</Link>
        <a href="mailto:yacob@gangrey.org">Submit</a>
        <SubscribeButton>Subscribe</SubscribeButton>
      </nav>
      <p className="mag-footer-copy">© 2026 Gangrey | A Literary Magazine.</p>
    </footer>
  );
}

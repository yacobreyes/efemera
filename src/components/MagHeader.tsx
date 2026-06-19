import Link from "next/link";

export default function MagHeader() {
  return (
    <header className="mag-nav">
      <style>{`
        .mag-nav {
          height: 92px;
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          padding: 0 44px;
          border-bottom: 1px solid #cfc3b3;
          background: #fbf6ee;
          position: sticky;
          top: 0;
          z-index: 20;
        }
        .mag-nav-group {
          display: flex;
          gap: 38px;
          align-items: center;
          font-family: Inter, system-ui, sans-serif;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: .16em;
          text-transform: uppercase;
          color: #171412;
        }
        .mag-nav-group a { color: inherit; text-decoration: none; }
        .mag-nav-group.right { justify-content: flex-end; }
        .mag-logo { display: block; justify-self: center; }
        .mag-logo img { height: 54px; width: auto; display: block; }
        .mag-nav-cta {
          background: #8e0d0d;
          color: #fff !important;
          padding: 7px 14px;
          border-radius: 2px;
        }
        @media (max-width: 900px) {
          .mag-nav { grid-template-columns: 1fr; justify-items: center; height: 70px; padding: 0 20px; }
          .mag-nav-group { display: none; }
          .mag-logo img { height: 44px; }
        }
      `}</style>
      <nav className="mag-nav-group">
        <Link href="/?tab=About">About</Link>
        <Link href="/">The Latest</Link>
        <Link href="/gangrey">Gangrey</Link>
      </nav>
      <Link href="/" className="mag-logo" aria-label="Home">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/Crimson Wordmark.png" alt="efemera" />
      </Link>
      <nav className="mag-nav-group right">
        <Link href="/archive">Archive</Link>
        <Link href="/store">Store</Link>
        <Link href="/#subscribe" className="mag-nav-cta">Subscribe</Link>
      </nav>
    </header>
  );
}

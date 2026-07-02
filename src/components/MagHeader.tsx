"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

function computeDateStr() {
  return new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

// Module-level (not component state) so it survives across MagHeader
// remounts during client-side page navigation within the same tab — the
// value is set once real browser local time is known and reused instantly
// on every subsequent page, avoiding a blank-then-populate "blink." It
// starts empty so the very first server-rendered paint matches hydration
// exactly (no SSR/client mismatch, since the server's clock/timezone can
// legitimately differ from the visitor's — e.g. showing "tomorrow" hours
// before the visitor's real local midnight).
let cachedDateStr = "";

export default function MagHeader({ onLogoClick }: { onLogoClick?: () => void }) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [dateStr, setDateStr] = useState(cachedDateStr);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const d = computeDateStr();
    cachedDateStr = d;
    setDateStr(d);
  }, []);

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  function openSearch() { setSearchOpen(true); }
  function closeSearch() { setSearchOpen(false); setSearchQ(""); }

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    if (searchQ.trim()) {
      router.push(`/?q=${encodeURIComponent(searchQ.trim())}`);
      closeSearch();
    }
  }

  const logoInner = (
    // eslint-disable-next-line @next/next/no-img-element
    <img className="mag-wordmark-img" src="/Wordmark.png?v=7" alt="Gangrey" />
  );

  return (
    <header className={`mag-header${menuOpen ? " open" : ""}${searchOpen ? " search-open" : ""}`}>
      <style>{`
        .mag-header {
          background: #ffffff;
          position: sticky;
          top: 0;
          z-index: 20;
        }

        /* ---- Masthead: eyebrow / wordmark / vol-no bar ---- */
        .mag-masthead { padding: 12px 76px 0; }
        .mag-eyebrow {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          font-family: var(--font-subhead);
          font-weight: 700;
          font-size: 9px;
          letter-spacing: .18em;
          text-transform: uppercase;
          color: #490000;
        }
        .mag-eyebrow .center { color: #000000; letter-spacing: .16em; text-align: center; white-space: nowrap; }
        .mag-eyebrow .right { text-align: right; }
        .mag-wordmark-link { display: block; width: fit-content; margin: 10px auto 8px; line-height: 0; background: none; border: none; padding: 0; cursor: pointer; }
        .mag-wordmark-img { display: block; height: 54px; width: auto; margin: 0 auto; }
        .mag-volno {
          border-top: 1px solid #000000;
          border-bottom: 2px solid #490000;
          padding: 5px 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          font-family: var(--font-subhead);
          font-weight: 700;
          font-size: 9px;
          letter-spacing: .16em;
          text-transform: uppercase;
          color: #000000;
          white-space: nowrap;
          overflow: hidden;
        }
        .mag-volno .tag { color: #490000; overflow: hidden; text-overflow: ellipsis; }

        /* ---- Nav row ---- */
        .mag-nav {
          height: 42px;
          display: grid;
          grid-template-columns: 1fr auto;
          align-items: center;
          padding: 0 76px;
          position: relative;
          overflow: hidden;
        }
        .mag-nav-group {
          display: flex;
          gap: clamp(16px, 2vw, 28px);
          align-items: center;
          font-family: var(--font-subhead);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: .15em;
          text-transform: uppercase;
          color: #000000;
          white-space: nowrap;
        }
        .mag-nav-group a { color: inherit; text-decoration: none; transition: color .15s; }
        .mag-nav-group a:hover { color: #490000; }
        .mag-nav-group.right { justify-content: flex-end; gap: clamp(14px, 1.5vw, 20px); }
        .mag-nav-cta {
          color: #490000 !important;
          background: none;
          border: none;
          padding: 0;
          font-family: var(--font-subhead);
          font-size: 9.5px;
          font-weight: 700;
          letter-spacing: .14em;
          text-transform: uppercase;
          cursor: pointer;
        }
        .mag-search-btn {
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px;
          color: #000000;
          display: flex;
          align-items: center;
          transition: color .15s;
        }
        .mag-search-btn:hover { color: #490000; }

        /* Desktop search overlay */
        .mag-search-bar {
          display: none;
          position: absolute;
          inset: 0;
          background: #ffffff;
          align-items: center;
          padding: 0 76px;
          gap: 20px;
          z-index: 1;
        }
        .mag-nav.search-open .mag-search-bar { display: flex; }
        .mag-header.search-open .mag-search-bar { display: flex; }
        .mag-search-form {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 12px;
          border: 1px solid #b8b8ba;
          border-radius: 30px;
          padding: 10px 20px;
          background: #fff;
          max-width: 460px;
          margin: 0 auto;
        }
        .mag-search-form input {
          flex: 1;
          border: none;
          outline: none;
          background: transparent;
          font-family: var(--font-subhead);
          font-size: 15px;
          color: #000000;
        }
        .mag-search-form input::placeholder { color: #b8b8ba; }
        .mag-search-cancel {
          background: none;
          border: none;
          cursor: pointer;
          font-family: var(--font-subhead);
          font-size: 13px;
          font-weight: 700;
          letter-spacing: .08em;
          text-transform: uppercase;
          color: #000000;
          flex-shrink: 0;
          padding: 4px 0;
          transition: color .15s;
        }
        .mag-search-cancel:hover { color: #490000; }

        .mag-toggle { display: none; }
        .mag-drawer { display: none; }
        .mag-nav-right-mobile { display: none; }

        @media (max-width: 1100px) {
          .mag-masthead { padding: 10px 20px 0; }
          .mag-eyebrow { font-size: 8px; letter-spacing: .1em; gap: 6px; }
          .mag-eyebrow .left, .mag-eyebrow .right, .mag-eyebrow .center {
            white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0;
          }
          .mag-wordmark-link { margin: 8px auto 6px; }
          .mag-wordmark-img { height: 38px; }
          .mag-volno { font-size: 9px; letter-spacing: .12em; gap: 10px; padding: 5px 0; }

          .mag-nav {
            height: auto;
            padding: 8px 20px;
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            justify-content: space-between;
          }
          .mag-nav-group { display: none; }
          .mag-search-bar { padding: 0 20px; }
          .mag-toggle {
            display: flex;
            flex-direction: column;
            gap: 4px;
            background: none;
            border: none;
            cursor: pointer;
            padding: 6px 8px 6px 0;
          }
          .mag-toggle span {
            display: block;
            width: 18px;
            height: 1.5px;
            background: #000000;
            transition: all .2s;
          }
          .mag-nav-right-mobile {
            display: flex;
            align-items: center;
            gap: 16px;
          }
          .mag-mob-sub {
            display: block;
            font-family: var(--font-subhead);
            font-size: 10px;
            font-weight: 700;
            letter-spacing: .14em;
            text-transform: uppercase;
            color: #490000;
            background: none;
            padding: 0;
            border: none;
            cursor: pointer;
          }
          .mag-drawer {
            flex-direction: column;
            width: 100%;
            border-top: 1px solid #b8b8ba;
            padding: 12px 0 24px;
          }
          .mag-drawer a {
            font-family: var(--font-subhead);
            font-size: 15px;
            font-weight: 700;
            letter-spacing: .14em;
            text-transform: uppercase;
            color: #000000;
            padding: 16px 4px;
            display: block;
            text-decoration: none;
          }
          .mag-drawer-search {
            display: flex;
            align-items: center;
            gap: 8px;
            border-bottom: 1px solid #b8b8ba;
            margin-bottom: 4px;
            padding: 12px 4px;
          }
          .mag-drawer-search input {
            flex: 1;
            border: none;
            outline: none;
            background: transparent;
            font-family: var(--font-subhead);
            font-size: 14px;
            font-weight: 600;
            color: #000000;
          }
          .mag-drawer-search input::placeholder { color: #b8b8ba; font-weight: 500; }
          .mag-drawer-search svg { flex-shrink: 0; color: #000000; }
          .mag-header.open .mag-drawer { display: flex; }
          .mag-header.open .mag-toggle span:nth-child(1) { transform: translateY(6.5px) rotate(45deg); }
          .mag-header.open .mag-toggle span:nth-child(2) { opacity: 0; }
          .mag-header.open .mag-toggle span:nth-child(3) { transform: translateY(-6.5px) rotate(-45deg); }
        }
      `}</style>

      <div className="mag-masthead">
        <div className="mag-eyebrow">
          <span className="left">A Literary Magazine</span>
          <span className="center">{dateStr}</span>
          <span className="right">gangrey.org</span>
        </div>
        {onLogoClick ? (
          <button className="mag-wordmark-link" onClick={onLogoClick} aria-label="Home">{logoInner}</button>
        ) : (
          <Link href="/" className="mag-wordmark-link" aria-label="Home">{logoInner}</Link>
        )}
        <div className="mag-volno">
          <span>Vol. I &middot; No. 1</span>
          <span className="tag">Prolonging the Slow Death of Newspapers</span>
          <span>Est. 2026</span>
        </div>
      </div>

      <div className="mag-nav">
        {/* Desktop search overlay — sits on top of the normal nav */}
        <div className="mag-search-bar">
          <form className="mag-search-form" onSubmit={submitSearch}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#b8b8ba" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              ref={searchInputRef}
              type="search"
              placeholder={`Try "Gangrey"`}
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              autoComplete="off"
            />
          </form>
          <button className="mag-search-cancel" type="button" onClick={closeSearch}>Cancel</button>
        </div>

        <nav className="mag-nav-group">
          <Link href="/about">About</Link>
          <Link href="/latest">The Latest</Link>
          <Link href="/archive">The Archive</Link>
          <Link href="/issues">Issues</Link>
          <Link href="/store">Shop</Link>
        </nav>

        <nav className="mag-nav-group right">
          <button className="mag-search-btn" aria-label="Search" onClick={openSearch}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </button>
          <Link href="/subscribe" className="mag-nav-cta">Subscribe</Link>
        </nav>

        {/* Mobile */}
        <button className="mag-toggle" aria-label="Menu" onClick={() => setMenuOpen(o => !o)}>
          <span /><span /><span />
        </button>
        <div className="mag-nav-right-mobile">
          <Link href="/subscribe" className="mag-mob-sub">Subscribe</Link>
        </div>
        <div className="mag-drawer">
          <form
            className="mag-drawer-search"
            onSubmit={e => {
              e.preventDefault();
              if (searchQ.trim()) { router.push(`/?q=${encodeURIComponent(searchQ.trim())}`); setMenuOpen(false); setSearchQ(""); }
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input type="search" placeholder="Search stories…" value={searchQ} onChange={e => setSearchQ(e.target.value)} autoComplete="off" />
          </form>
          <Link href="/about" onClick={() => setMenuOpen(false)}>About</Link>
          <Link href="/latest" onClick={() => setMenuOpen(false)}>The Latest</Link>
          <Link href="/archive" onClick={() => setMenuOpen(false)}>The Archive</Link>
          <Link href="/issues" onClick={() => setMenuOpen(false)}>Issues</Link>
          <Link href="/store" onClick={() => setMenuOpen(false)}>Shop</Link>
        </div>
      </div>
    </header>
  );
}

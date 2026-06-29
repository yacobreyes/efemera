"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import SubscribeButton from "@/components/SubscribeButton";

export default function MagHeader({ onLogoClick }: { onLogoClick?: () => void }) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

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

  return (
    <header className={`mag-nav${menuOpen ? " open" : ""}${searchOpen ? " search-open" : ""}`}>
      <style>{`
        .mag-nav {
          height: 100px;
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          padding: 0 44px;
          border-bottom: 1px solid #b8b8ba;
          background: #b8b8ba;
          position: sticky;
          top: 0;
          z-index: 20;
          overflow: hidden;
        }
        .mag-nav-group {
          display: flex;
          gap: clamp(20px, 2.4vw, 38px);
          align-items: center;
          font-family: var(--font-subhead);
          font-size: 12px;
          font-weight: 700;
          letter-spacing: .16em;
          text-transform: uppercase;
          color: #000000;
          white-space: nowrap;
        }
        .mag-nav-group a { color: inherit; text-decoration: none; transition: color .15s; }
        .mag-nav-group a:hover { color: #490000; }
        .mag-nav-group.right { justify-content: flex-end; gap: clamp(16px, 1.8vw, 28px); }
        .mag-logo { display: block; justify-self: center; background: none; border: none; padding: 0; cursor: pointer; text-decoration: none; line-height: 0; }
        .mag-logo-img {
          height: clamp(34px, 4vw, 58px);
          width: auto;
          display: block;
        }
        .mag-nav-cta {
          background: #490000;
          color: #fff !important;
          padding: 7px 14px;
          border-radius: 2px;
          font-family: var(--font-subhead);
          font-size: 12px;
          font-weight: 700;
          letter-spacing: .14em;
          text-transform: uppercase;
          border: none;
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
          background: #b8b8ba;
          align-items: center;
          padding: 0 44px;
          gap: 20px;
          z-index: 1;
        }
        .mag-nav.search-open .mag-search-bar { display: flex; }
        .mag-search-form {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 12px;
          border: 1px solid #b8b8ba;
          border-radius: 30px;
          padding: 10px 20px;
          background: #fff;
          max-width: 680px;
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
        .mag-mob-sub { display: none; }
        .mag-drawer { display: none; }

        @media (max-width: 1100px) {
          .mag-nav {
            height: auto;
            min-height: 72px;
            padding: 0 20px;
            display: flex;
            flex-wrap: wrap;
            align-items: center;
          }
          .mag-nav-group { display: none; }
          .mag-search-btn { display: none; }
          .mag-search-bar { padding: 0 20px; }
          .mag-toggle {
            display: flex;
            flex-direction: column;
            justify-content: center;
            gap: 5px;
            height: 72px;
            background: none;
            border: none;
            cursor: pointer;
            padding: 0 8px 0 0;
            order: 1;
          }
          .mag-toggle span {
            display: block;
            width: 22px;
            height: 1.5px;
            background: #000000;
            transition: all .2s;
          }
          /* Pin the wordmark to the true center of the bar, independent of the
             differing widths of the menu toggle (left) and Subscribe button
             (right). Absolutely positioned, so the row height comes from the
             nav's min-height above; toggle and Subscribe stay in flow at the
             edges. */
          .mag-logo {
            position: absolute;
            left: 50%;
            top: 0;
            transform: translateX(-50%);
            height: 72px;
            display: flex;
            align-items: center;
            order: 2;
            padding: 0;
            text-align: center;
            justify-self: unset;
          }
          .mag-logo-img { height: clamp(30px, 9vw, 46px); margin: 0; }
          .mag-mob-sub {
            display: block;
            order: 3;
            /* Logo is absolutely centered, so push Subscribe to the right edge.
               Shrunk to leave clearance for the centered wordmark on narrow
               screens. */
            margin-left: auto;
            font-family: var(--font-subhead);
            font-size: 10px;
            font-weight: 700;
            letter-spacing: .1em;
            text-transform: uppercase;
            color: #fff;
            background: #490000;
            padding: 6px 10px;
            border-radius: 2px;
            border: none;
            cursor: pointer;
          }
          .mag-drawer {
            flex-direction: column;
            width: 100%;
            order: 4;
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
          .mag-nav.open .mag-drawer { display: flex; }
          .mag-nav.open .mag-toggle span:nth-child(1) { transform: translateY(6.5px) rotate(45deg); }
          .mag-nav.open .mag-toggle span:nth-child(2) { opacity: 0; }
          .mag-nav.open .mag-toggle span:nth-child(3) { transform: translateY(-6.5px) rotate(-45deg); }
        }
      `}</style>

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
      </nav>

      {onLogoClick ? (
        <button className="mag-logo" onClick={onLogoClick} aria-label="Home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="mag-logo-img" src="/Wordmark.png?v=7" alt="Gangrey" />
        </button>
      ) : (
        <Link href="/" className="mag-logo" aria-label="Home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="mag-logo-img" src="/Wordmark.png?v=7" alt="Gangrey" />
        </Link>
      )}

      <nav className="mag-nav-group right">
        <Link href="/issues">Issues</Link>
        <Link href="/store">Shop</Link>
        <button className="mag-search-btn" aria-label="Search" onClick={openSearch}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </button>
        <SubscribeButton className="mag-nav-cta">Subscribe</SubscribeButton>
      </nav>

      {/* Mobile */}
      <button className="mag-toggle" aria-label="Menu" onClick={() => setMenuOpen(o => !o)}>
        <span /><span /><span />
      </button>
      <SubscribeButton className="mag-mob-sub">Subscribe</SubscribeButton>
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
    </header>
  );
}

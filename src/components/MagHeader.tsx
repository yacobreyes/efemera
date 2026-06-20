"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import SubscribeButton from "@/components/SubscribeButton";

export default function MagHeader({ onLogoClick }: { onLogoClick?: () => void }) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQ, setSearchQ] = useState("");

  return (
    <header className={`mag-nav${menuOpen ? " open" : ""}`}>
      <style>{`
        .mag-nav {
          height: 100px;
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
        .mag-logo { display: block; justify-self: center; background: none; border: none; padding: 0; cursor: pointer; }
        .mag-logo img { height: 58px; width: auto; display: block; }
        .mag-nav-cta {
          background: #8e0d0d;
          color: #fff !important;
          padding: 7px 14px;
          border-radius: 2px;
          font-family: Inter, system-ui, sans-serif;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: .14em;
          text-transform: uppercase;
          border: none;
          cursor: pointer;
        }
        .mag-toggle { display: none; }
        .mag-mob-sub { display: none; }
        .mag-drawer { display: none; }

        @media (max-width: 900px) {
          .mag-nav {
            height: auto;
            padding: 0 20px;
            display: flex;
            flex-wrap: wrap;
            align-items: center;
          }
          .mag-nav-group { display: none; }
          .mag-toggle {
            display: flex;
            flex-direction: column;
            gap: 5px;
            background: none;
            border: none;
            cursor: pointer;
            padding: 8px 8px 8px 0;
            order: 1;
          }
          .mag-toggle span {
            display: block;
            width: 22px;
            height: 1.5px;
            background: #171412;
            transition: all .2s;
          }
          .mag-logo {
            flex: 1;
            text-align: center;
            padding: 16px 0;
            order: 2;
            justify-self: unset;
          }
          .mag-logo img { height: 40px; margin: 0 auto; }
          .mag-mob-sub {
            display: block;
            order: 3;
            font-family: Inter, system-ui, sans-serif;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: .12em;
            text-transform: uppercase;
            color: #fff;
            background: #8e0d0d;
            padding: 7px 12px;
            border-radius: 2px;
            border: none;
            cursor: pointer;
          }
          .mag-drawer {
            flex-direction: column;
            width: 100%;
            order: 4;
            border-top: 1px solid #cfc3b3;
            padding: 12px 0 24px;
          }
          .mag-drawer a {
            font-family: Inter, system-ui, sans-serif;
            font-size: 15px;
            font-weight: 700;
            letter-spacing: .14em;
            text-transform: uppercase;
            color: #171412;
            padding: 16px 4px;
            display: block;
            text-decoration: none;
          }
          .mag-drawer-search {
            display: flex;
            align-items: center;
            gap: 8px;
            border-bottom: 1px solid #cfc3b3;
            margin-bottom: 4px;
            padding: 12px 4px;
          }
          .mag-drawer-search input {
            flex: 1;
            border: none;
            outline: none;
            background: transparent;
            font-family: Inter, system-ui, sans-serif;
            font-size: 14px;
            font-weight: 600;
            color: #171412;
          }
          .mag-drawer-search input::placeholder { color: #cfc3b3; font-weight: 500; }
          .mag-drawer-search svg { flex-shrink: 0; color: #171412; }
          .mag-nav.open .mag-drawer { display: flex; }
          .mag-nav.open .mag-toggle span:nth-child(1) { transform: translateY(6.5px) rotate(45deg); }
          .mag-nav.open .mag-toggle span:nth-child(2) { opacity: 0; }
          .mag-nav.open .mag-toggle span:nth-child(3) { transform: translateY(-6.5px) rotate(-45deg); }
        }
      `}</style>

      <nav className="mag-nav-group">
        <Link href="/about">About</Link>
        <Link href="/latest">The Latest</Link>
        <Link href="/gangrey">Gangrey Redux</Link>
      </nav>

      {onLogoClick ? (
        <button className="mag-logo" onClick={onLogoClick} aria-label="Home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/Crimson Wordmark.png" alt="efemera" />
        </button>
      ) : (
        <Link href="/" className="mag-logo" aria-label="Home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/Crimson Wordmark.png" alt="efemera" />
        </Link>
      )}

      <nav className="mag-nav-group right">
        <Link href="/issues">Issues</Link>
        <Link href="/store">Shop</Link>
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
        <Link href="/gangrey" onClick={() => setMenuOpen(false)}>Gangrey Redux</Link>
        <Link href="/" onClick={() => setMenuOpen(false)}>Issues</Link>
        <Link href="/store" onClick={() => setMenuOpen(false)}>Shop</Link>
      </div>
    </header>
  );
}

"use client";
import MagHeader from "@/components/MagHeader";
import MagFooter from "@/components/MagFooter";
import SubscribeButton from "@/components/SubscribeButton";

export default function StorePage() {
  return (
    <div className="store-page">
      <style>{`
        .store-page { min-height: 100vh; display: flex; flex-direction: column; background: #f5efe4; color: #171412; }
        .store-main {
          flex: 1; width: 100%; max-width: 720px; margin: 0 auto;
          padding: 96px 24px; box-sizing: border-box; text-align: center;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
        }
        .store-kicker {
          font-family: Inter, system-ui, sans-serif;
          font-size: 12px; font-weight: 800; letter-spacing: .22em; text-transform: uppercase;
          color: #8e0d0d; margin-bottom: 18px;
        }
        .store-title {
          font-family: "Cormorant Garamond", Georgia, serif;
          font-size: clamp(48px, 9vw, 88px); line-height: .98; letter-spacing: -.03em; margin: 0 0 22px;
        }
        .store-body {
          font-family: "Cormorant Garamond", Georgia, serif;
          font-size: 24px; line-height: 1.45; font-style: italic; color: #463f37;
          max-width: 480px; margin: 0 0 34px;
        }
        .store-cta {
          font-family: Inter, system-ui, sans-serif;
          font-size: 12px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase;
          background: #8e0d0d; color: #fff; border: none; cursor: pointer;
          padding: 14px 26px; border-radius: 2px;
        }
        .store-fly { width: 64px; height: auto; opacity: .85; margin-bottom: 28px; }
      `}</style>
      <MagHeader />
      <main className="store-main">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/Black Mayfly.png" alt="" className="store-fly" />
        <div className="store-kicker">The Store</div>
        <h1 className="store-title">Coming Soon</h1>
        <p className="store-body">
          Print issues, prints, and ephemera are on the way. Join the newsletter to hear first.
        </p>
        <SubscribeButton className="store-cta">Join the Newsletter</SubscribeButton>
      </main>
      <MagFooter />
    </div>
  );
}

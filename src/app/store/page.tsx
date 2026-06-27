"use client";
import MagHeader from "@/components/MagHeader";
import MagFooter from "@/components/MagFooter";

export default function StorePage() {
  return (
    <div className="store-page">
      <style>{`
        .store-page { min-height: 100vh; display: flex; flex-direction: column; background: #ffffff; color: #000000; }
        .store-main {
          flex: 1; display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          text-align: center; padding: 24px;
        }
        .store-title {
          font-family: var(--font-headline);
          font-size: clamp(44px, 7vw, 72px); line-height: .98;
          letter-spacing: -.03em; margin: 0;
        }
      `}</style>
      <MagHeader />
      <main className="store-main">
        <h1 className="store-title">Coming Soon</h1>
      </main>
      <MagFooter />
    </div>
  );
}

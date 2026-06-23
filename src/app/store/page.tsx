"use client";
import MagHeader from "@/components/MagHeader";
import MagFooter from "@/components/MagFooter";

export default function StorePage() {
  return (
    <div className="store-page">
      <style>{`
        .store-page { min-height: 100vh; display: flex; flex-direction: column; background: #f5efe4; color: #171412; }
        .store-main {
          flex: 1; display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          text-align: center; padding: 24px;
        }
        .store-title {
          font-family: var(--font-cormorant), Georgia, serif;
          font-size: clamp(48px, 9vw, 88px); line-height: .98;
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

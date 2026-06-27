"use client";
import MagHeader from "@/components/MagHeader";
import MagFooter from "@/components/MagFooter";
import ListingHeader from "@/components/ListingHeader";

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
      `}</style>
      <MagHeader />
      <main className="store-main">
        <ListingHeader title="Coming Soon" align="center" bordered={false} marginBottom={0} />
      </main>
      <MagFooter />
    </div>
  );
}

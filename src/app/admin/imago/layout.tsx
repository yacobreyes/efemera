import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gangrey | imago",
  icons: {
    icon: [{ url: "/favicon.png", type: "image/png" }],
    shortcut: [{ url: "/favicon.png", type: "image/png" }],
  },
};

export default function ImagoLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* The admin app manages its own internal scrolling (height: 100vh), so the
          document never scrolls. The global `scrollbar-gutter: stable` would still
          reserve an empty strip on the right that shows through as a band beside the
          editor — kill it here so the layout reaches the edge. */}
      <style>{`html { scrollbar-gutter: auto !important; } html, body { background: #f5f8fa !important; }`}</style>
      {children}
    </>
  );
}

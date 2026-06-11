import type { Metadata, Viewport } from "next";

export const metadata: Metadata = { robots: "noindex", referrer: "same-origin" };
export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}

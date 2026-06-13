import type { Metadata } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://efemera.vercel.app";

export const metadata: Metadata = {
  title: "Efemera - Life, in Brief.",
  description: "A literary blog about the ephemeral moments that make a life.",
  icons: { icon: "/Favicon.jpg" },
  metadataBase: new URL(siteUrl),
  openGraph: {
    siteName: "Efemera",
    title: "Efemera - Life, in Brief.",
    description: "A literary blog about the ephemeral moments that make a life.",
    url: siteUrl,
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Efemera" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Efemera - Life, in Brief.",
    description: "A literary blog about the ephemeral moments that make a life.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

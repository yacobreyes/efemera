import type { Metadata, Viewport } from "next";
import "./globals.css";
import SessionProviderWrapper from "@/components/SessionProviderWrapper";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://gangrey.org";

export const metadata: Metadata = {
  title: "Gangrey | A Literary Magazine",
  description: "Gangrey is a literary magazine that publishes true stories for the time you have — read reported narratives, essays, micro-memoirs, and craft talks.",
  metadataBase: new URL(siteUrl),
  alternates: {
    types: { "application/rss+xml": `${siteUrl}/feed.xml` },
  },
  openGraph: {
    siteName: "Gangrey",
    title: "Gangrey | A Literary Magazine",
    description: "Gangrey is a literary magazine that publishes true stories for the time you have — read reported narratives, essays, micro-memoirs, and craft talks.",
    url: siteUrl,
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Gangrey Magazine" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Gangrey | A Literary Magazine",
    description: "Gangrey is a literary magazine that publishes true stories for the time you have — read reported narratives, essays, micro-memoirs, and craft talks.",
    images: ["/og-image.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://use.typekit.net" crossOrigin="" />
        <link rel="stylesheet" href="https://use.typekit.net/umi3ufr.css" />
      </head>
      <body><SessionProviderWrapper>{children}</SessionProviderWrapper></body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import { Inter, Bodoni_Moda, Cormorant_Garamond } from "next/font/google";
import "./globals.css";
import SessionProviderWrapper from "@/components/SessionProviderWrapper";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const bodoni = Bodoni_Moda({ subsets: ["latin"], variable: "--font-bodoni", display: "swap", style: ["normal", "italic"], weight: ["400", "700"] });
const cormorant = Cormorant_Garamond({ subsets: ["latin"], variable: "--font-cormorant", display: "swap", style: ["normal", "italic"], weight: ["500", "600", "700"] });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://efemera.vercel.app";

export const metadata: Metadata = {
  title: "Efemera | A Journal of Creative Nonfiction",
  description: "True stories for the time you have.",
  icons: { icon: "/favicon.png" },
  metadataBase: new URL(siteUrl),
  alternates: {
    types: { "application/rss+xml": `${siteUrl}/feed.xml` },
  },
  openGraph: {
    siteName: "Efemera",
    title: "Efemera | A Journal of Creative Nonfiction",
    description: "True stories for the time you have.",
    url: siteUrl,
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Efemera" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Efemera | A Journal of Creative Nonfiction",
    description: "True stories for the time you have.",
    images: ["/og-image.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#fbf6ee",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${bodoni.variable} ${cormorant.variable}`}>
      <head>
        <link rel="preload" as="image" href="/Masthead.webp" />
      </head>
      <body><SessionProviderWrapper>{children}</SessionProviderWrapper></body>
    </html>
  );
}

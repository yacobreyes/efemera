import type { Metadata } from "next";
import { Inter, Bodoni_Moda, Libre_Caslon_Display, Libre_Caslon_Text, Archivo } from "next/font/google";
import "./globals.css";
import SessionProviderWrapper from "@/components/SessionProviderWrapper";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const bodoni = Bodoni_Moda({ subsets: ["latin"], variable: "--font-bodoni", display: "swap", style: ["normal", "italic"], weight: ["400", "700"] });
// New-Yorker-style type system for the broadsheet front page: Caslon for
// display heds + body (≈ Adobe Caslon), Archivo for section flags/bylines (≈ Neutraface).
const caslonDisplay = Libre_Caslon_Display({ subsets: ["latin"], variable: "--font-caslon-display", display: "swap", weight: "400" });
const caslonText = Libre_Caslon_Text({ subsets: ["latin"], variable: "--font-caslon-text", display: "swap", style: ["normal", "italic"], weight: "400" });
const archivo = Archivo({ subsets: ["latin"], variable: "--font-archivo", display: "swap", weight: ["400", "500", "600", "700"] });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://efemera.vercel.app";

export const metadata: Metadata = {
  title: "Efemera - Life, in Brief.",
  description: "A literary blog by Yacob Reyes.",
  icons: { icon: "/favicon.png" },
  metadataBase: new URL(siteUrl),
  alternates: {
    types: { "application/rss+xml": `${siteUrl}/feed.xml` },
  },
  openGraph: {
    siteName: "Efemera",
    title: "Efemera - Life, in Brief.",
    description: "A literary blog by Yacob Reyes.",
    url: siteUrl,
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Efemera" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Efemera - Life, in Brief.",
    description: "A literary blog by Yacob Reyes.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${bodoni.variable} ${caslonDisplay.variable} ${caslonText.variable} ${archivo.variable}`}>
      <head>
        <link rel="preload" as="image" href="/Masthead.webp" />
      </head>
      <body><SessionProviderWrapper>{children}</SessionProviderWrapper></body>
    </html>
  );
}

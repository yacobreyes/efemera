import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Efemera — Life, in Brief.",
  description: "A literary blog about the ephemeral moments that make a life.",
  icons: { icon: "/Favicon.jpg" },
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

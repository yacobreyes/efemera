import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "imago",
  icons: { icon: "/imago-favicon.png" },
};

export default function ImagoLayout({ children }: { children: React.ReactNode }) {
  return children;
}

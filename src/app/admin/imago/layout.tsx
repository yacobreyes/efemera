import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "imago",
  icons: {
    icon: [{ url: "/imago-favicon.png", type: "image/png" }],
    shortcut: [{ url: "/imago-favicon.png", type: "image/png" }],
  },
};

export default function ImagoLayout({ children }: { children: React.ReactNode }) {
  return children;
}

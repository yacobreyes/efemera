import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "flatplan",
  icons: {
    icon: [{ url: "/imago-favicon.png", type: "image/png" }],
    shortcut: [{ url: "/imago-favicon.png", type: "image/png" }],
  },
};

export default function ImagoLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`html, body { background: #f5f8fa !important; }`}</style>
      {children}
    </>
  );
}

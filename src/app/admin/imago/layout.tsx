import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "imago",
};

export default function ImagoLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <head>
        <link rel="icon" href="/imago-favicon.png" />
      </head>
      {children}
    </>
  );
}

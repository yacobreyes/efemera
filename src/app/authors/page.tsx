import type { Metadata } from "next";
import { client } from "@/lib/sanity";
import MagHeader from "@/components/MagHeader";
import MagFooter from "@/components/MagFooter";
import AuthorsClient from "./AuthorsClient";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Authors — Efemera",
  description: "Writers featured in Efemera.",
};

const QUERY = `*[_type == "post" && (status == "published" || !defined(status)) && defined(byline) && byline != ""] {
  "byline": byline
}`;

export default async function AuthorsPage() {
  let bylines: { byline: string }[] = [];
  try { bylines = await client.fetch(QUERY, {}, { next: { revalidate: 60 } }); } catch {}

  // Count posts per author and sort alphabetically by last name
  const counts = new Map<string, number>();
  for (const { byline } of bylines) {
    const name = byline.trim();
    if (name) counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  const authors = [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => {
      const lastA = a.name.split(/\s+/).at(-1)!.toLowerCase();
      const lastB = b.name.split(/\s+/).at(-1)!.toLowerCase();
      return lastA.localeCompare(lastB);
    });

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#ffffff" }}>
      <MagHeader />
      <main style={{ flex: 1, width: "100%", maxWidth: 1100, margin: "0 auto", padding: "60px 44px 100px", boxSizing: "border-box" }}>
        <AuthorsClient authors={authors} />
      </main>
      <MagFooter />
    </div>
  );
}

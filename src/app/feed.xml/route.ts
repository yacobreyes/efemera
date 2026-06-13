import { getAllPosts } from "@/lib/sanity";

export const dynamic = "force-dynamic";

export async function GET() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://efemera.vercel.app";
  const posts = await getAllPosts();

  const items = posts
    .filter(p => p.status === "published" || !p.status)
    .map(p => {
      const body = (p.body ?? [])
        .filter((b: { _type: string }) => b._type === "block")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((b: any) => (b.children ?? []).map((c: any) => c.text ?? "").join(""))
        .join("\n\n")
        .slice(0, 500);

      return `
    <item>
      <title><![CDATA[${p.headline}]]></title>
      <link>${siteUrl}/stories/${p.slug}</link>
      <guid>${siteUrl}/stories/${p.slug}</guid>
      <pubDate>${new Date(p.date).toUTCString()}</pubDate>
      <description><![CDATA[${p.subheadline || body}]]></description>
      <author>${p.byline}</author>
      <category>${p.section}</category>
    </item>`;
    })
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Efemera</title>
    <link>${siteUrl}</link>
    <description>A literary blog about the ephemeral moments that make a life.</description>
    <language>en-us</language>
    <atom:link href="${siteUrl}/feed.xml" rel="self" type="application/rss+xml"/>
    ${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

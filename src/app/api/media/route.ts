import { isAuthed } from "@/lib/adminAuth";
import { client } from "@/lib/sanity";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAuthed())) return NextResponse.json([], { status: 401 });
  try {
    const [assets, posts] = await Promise.all([
      client.fetch(
        `*[_type == "sanity.imageAsset"] | order(_createdAt desc) {
          _id, _createdAt, url, originalFilename, title, description, altText,
          metadata { dimensions { width, height }, size }
        }`,
        {},
        { cache: "no-store" }
      ),
      client.fetch(
        `*[_type == "post" && defined(image.asset._ref)] { "slug": slug.current, headline, "assetId": image.asset._ref }`,
        {},
        { cache: "no-store" }
      ),
    ]);
    const usageMap: Record<string, { slug: string; headline: string }[]> = {};
    for (const p of posts) {
      if (!usageMap[p.assetId]) usageMap[p.assetId] = [];
      usageMap[p.assetId].push({ slug: p.slug, headline: p.headline });
    }
    const enriched = assets.map((a: Record<string, unknown>) => ({ ...a, usedIn: usageMap[a._id as string] ?? [] }));
    return NextResponse.json(enriched);
  } catch {
    return NextResponse.json([]);
  }
}

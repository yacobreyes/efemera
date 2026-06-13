import { MetadataRoute } from "next";
import { getAllPosts } from "@/lib/sanity";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://efemera.vercel.app";
  const posts = await getAllPosts();

  const storyEntries: MetadataRoute.Sitemap = posts.map(p => ({
    url: `${siteUrl}/stories/${p.slug}`,
    lastModified: p._updatedAt ?? p.date,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  return [
    { url: siteUrl, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    ...storyEntries,
  ];
}

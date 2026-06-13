import { createClient } from "next-sanity";
import imageUrlBuilder from "@sanity/image-url";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SanityImageSource = any;

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production";

// The Vercel-Sanity integration sets SANITY_API_READ_TOKEN for server-side reads
const token = process.env.SANITY_API_READ_TOKEN;

export const client = createClient({
  projectId,
  dataset,
  apiVersion: "2024-01-01",
  useCdn: !token,
  token,
});

const builder = imageUrlBuilder(client);
export function urlFor(source: SanityImageSource) {
  return builder.image(source);
}

export interface SanityPost {
  _id: string;
  slug: string;
  section: "Micro-Memoir" | "Narratives";
  headline: string;
  subheadline: string;
  byline: string;
  date: string;
  body: import("@portabletext/types").PortableTextBlock[];
  image?: { asset: SanityImageSource; caption?: string; alt?: string };
  status?: "draft" | "published" | "scheduled" | "trashed";
  pinned?: boolean;
  scheduledAt?: string;
}

const POST_FIELDS = `
  _id,
  "slug": slug.current,
  section,
  headline,
  subheadline,
  byline,
  date,
  body,
  image { asset, caption, alt },
  status,
  pinned,
  scheduledAt
`;

const POSTS_QUERY = `*[_type == "post" && (
  status == "published" ||
  !defined(status) ||
  (status == "scheduled" && scheduledAt <= now())
)] | order(coalesce(pinned, false) desc, date desc) { ${POST_FIELDS} }`;

export async function getAllPosts(): Promise<SanityPost[]> {
  return client.fetch(POSTS_QUERY, {}, { cache: "no-store" });
}

export async function getAllPostsCached(): Promise<SanityPost[]> {
  return client.fetch(POSTS_QUERY, {}, { next: { revalidate: 60 } });
}

export async function getAllPostsAdmin(): Promise<SanityPost[]> {
  return client.fetch(
    `*[_type == "post" && !(_id in path("drafts.**"))] | order(date desc) { ${POST_FIELDS} }`,
    {},
    { cache: "no-store" }
  );
}

export async function getPost(slug: string): Promise<SanityPost | null> {
  return client.fetch(
    `*[_type == "post" && slug.current == $slug][0] { ${POST_FIELDS} }`,
    { slug },
    { cache: "no-store" }
  );
}

export async function getAllSlugs(): Promise<string[]> {
  return client.fetch(`*[_type == "post"].slug.current`, {}, { cache: "no-store" });
}

export interface SanityAbout {
  body: import("@portabletext/types").PortableTextBlock[];
}

export async function getAboutPage(): Promise<SanityAbout | null> {
  return client.fetch(`*[_type == "about" && _id == "about"][0] { body }`, {}, { cache: "no-store" });
}

export interface SanityLately {
  reading?: string;
  readingAuthor?: string;
  listening?: string;
  watching?: string;
}

export async function getLately(): Promise<SanityLately | null> {
  return client.fetch(
    `*[_type == "lately" && _id == "lately"][0] { reading, readingAuthor, listening, watching }`,
    {}, { cache: "no-store" }
  );
}

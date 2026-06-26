import { createClient } from "next-sanity";
import { straightenQuotes, straightenBlocks } from "./straighten";
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

// Re-exported for server-side call sites — client components should import
// from "@/lib/sanityImage" directly so they don't pull in next-sanity's
// createClient (this file) just to build an image URL.
export { urlFor } from "./sanityImage";

export interface SanityPost {
  _id: string;
  _updatedAt?: string;
  _createdAt?: string;
  slug: string;
  section: "Micro-Memoir" | "Narratives" | "Essays" | "Gangrey Redux";
  headline: string;
  subheadline: string;
  byline: string;
  date: string;
  body: import("@portabletext/types").PortableTextBlock[];
  image?: { asset: SanityImageSource; url?: string; caption?: string; alt?: string };
  status?: "draft" | "published" | "scheduled" | "trashed";
  scheduledAt?: string;
  seoHeadline?: string;
  socialHeadline?: string;
  socialDescription?: string;
  readingTime?: number;
  sortOrder?: number;
  searchText?: string;
}

// Lightweight field set for the admin dashboard list — excludes the heavy
// portable-text `body` (which can be huge across the full archive) and
// replaces it with a server-computed plain-text string for search only.
const POST_LIST_FIELDS = `
  _id,
  "slug": slug.current,
  section,
  headline,
  subheadline,
  byline,
  date,
  _updatedAt,
  _createdAt,
  "body": [],
  "searchText": pt::text(body),
  image { asset, caption, alt },
  status,
  scheduledAt,
  "readingTime": coalesce(readingTime, round(length(pt::text(body)) / 1100) + 1),
  sortOrder
`;

const POST_FIELDS = `
  _id,
  "slug": slug.current,
  section,
  headline,
  subheadline,
  byline,
  date,
  _updatedAt,
  _createdAt,
  body,
  image { asset, caption, alt },
  status,
  scheduledAt,
  seoHeadline,
  socialHeadline,
  socialDescription,
  readingTime,
  sortOrder
`;

const POSTS_QUERY = `*[_type == "post" && (
  status == "published" ||
  !defined(status) ||
  (status == "scheduled" && scheduledAt <= now())
)] | order(date desc) { ${POST_FIELDS} }`;

const sQ = (s?: string) => (typeof s === "string" ? straightenQuotes(s) : s);

// Enforce straight quotes on the way out so existing/archive content (which
// was imported with curly quotes) renders in house style everywhere.
function straightenPost(p: SanityPost): SanityPost {
  return {
    ...p,
    headline: sQ(p.headline) as string,
    subheadline: sQ(p.subheadline) as string,
    byline: sQ(p.byline) as string,
    seoHeadline: sQ(p.seoHeadline),
    socialHeadline: sQ(p.socialHeadline),
    socialDescription: sQ(p.socialDescription),
    searchText: sQ(p.searchText),
    body: p.body ? straightenBlocks(p.body) : p.body,
    image: p.image
      ? { ...p.image, caption: sQ(p.image.caption), alt: sQ(p.image.alt) }
      : p.image,
  };
}

export async function getAllPosts(): Promise<SanityPost[]> {
  const posts: SanityPost[] = await client.fetch(POSTS_QUERY, {}, { next: { revalidate: 60 } });
  return posts.map(straightenPost);
}

// Lightweight variant for listing pages (homepage, /latest) that only display
// metadata and need body solely for client-side search. Drops the heavy
// portable-text body and substitutes a server-computed plain-text searchText,
// drastically shrinking the payload shipped to the browser.
const POSTS_LIGHT_QUERY = `*[_type == "post" && (
  status == "published" ||
  !defined(status) ||
  (status == "scheduled" && scheduledAt <= now())
)] | order(date desc) { ${POST_LIST_FIELDS} }`;

export async function getPostsLight(): Promise<SanityPost[]> {
  const posts: SanityPost[] = await client.fetch(POSTS_LIGHT_QUERY, {}, { next: { revalidate: 60 } });
  return posts.map(straightenPost);
}


export async function getAllPostsAdmin(): Promise<SanityPost[]> {
  const posts: SanityPost[] = await client.fetch(
    `*[_type == "post" && !(_id in path("drafts.**"))] | order(_updatedAt desc) { ${POST_LIST_FIELDS} }`,
    {},
    { cache: "no-store" }
  );
  return posts.map(straightenPost);
}

export async function getPost(slug: string): Promise<SanityPost | null> {
  const post: SanityPost | null = await client.fetch(
    `*[_type == "post" && slug.current == $slug][0] { ${POST_FIELDS} }`,
    { slug },
    { next: { revalidate: 60 } }
  );
  return post ? straightenPost(post) : null;
}

export async function getAllSlugs(): Promise<string[]> {
  return client.fetch(`*[_type == "post"].slug.current`, {}, { next: { revalidate: 300 } });
}

export interface SanityIssue {
  _id: string;
  slug: string;
  number: number;
  title: string;
  description?: string;
  publishedAt: string;
  url?: string;
  newsletterId?: string;
}

export async function getAllIssues(): Promise<SanityIssue[]> {
  return client.fetch(
    `*[_type == "issue"] | order(publishedAt desc) { _id, "slug": slug.current, number, title, description, publishedAt, url, newsletterId }`,
    {}, { next: { revalidate: 60 } }
  );
}

export interface SanityAbout {
  body: import("@portabletext/types").PortableTextBlock[];
}

export async function getAboutPage(): Promise<SanityAbout | null> {
  return client.fetch(`*[_type == "about" && _id == "about"][0] { body }`, {}, { next: { revalidate: 300 } });
}

export interface SanityLately {
  reading?: string;
  readingAuthor?: string;
  readingUrl?: string;
  listening?: string;
  listeningArtist?: string;
  listeningUrl?: string;
  watching?: string;
  watchingUrl?: string;
}

export async function getLately(): Promise<SanityLately | null> {
  return client.fetch(
    `*[_type == "lately" && _id == "lately"][0] { reading, readingAuthor, readingUrl, listening, listeningArtist, listeningUrl, watching, watchingUrl }`,
    {}, { next: { revalidate: 300 } }
  );
}

export interface SanityWelcome { headline: string; body: string; }

export async function getWelcome(): Promise<SanityWelcome | null> {
  return client.fetch(
    `*[_type == "welcome" && _id == "welcome"][0]{ headline, body }`,
    {}, { next: { revalidate: 60 } }
  );
}

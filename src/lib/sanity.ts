import { createClient } from "next-sanity";
import imageUrlBuilder from "@sanity/image-url";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SanityImageSource = any;

export const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production",
  apiVersion: "2024-01-01",
  useCdn: true,
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
  image?: { asset: SanityImageSource; caption?: string };
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
  image { asset, caption }
`;

export async function getAllPosts(): Promise<SanityPost[]> {
  return client.fetch(
    `*[_type == "post"] | order(date desc) { ${POST_FIELDS} }`
  );
}

export async function getPost(slug: string): Promise<SanityPost | null> {
  return client.fetch(
    `*[_type == "post" && slug.current == $slug][0] { ${POST_FIELDS} }`,
    { slug }
  );
}

export async function getAllSlugs(): Promise<string[]> {
  return client.fetch(`*[_type == "post"].slug.current`);
}

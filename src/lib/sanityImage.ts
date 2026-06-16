import imageUrlBuilder from "@sanity/image-url";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SanityImageSource = any;

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production";

// Image URL building only needs projectId/dataset, not a full Sanity client —
// importing from "@/lib/sanity" here would pull next-sanity's createClient
// into every client bundle that renders an image (i.e. the public homepage).
const builder = imageUrlBuilder({ projectId, dataset });

export function urlFor(source: SanityImageSource) {
  return builder.image(source);
}

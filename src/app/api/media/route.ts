import { isAuthed } from "@/lib/adminAuth";
import { client } from "@/lib/sanity";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAuthed())) return NextResponse.json([], { status: 401 });
  try {
    const assets = await client.fetch(
      `*[_type == "sanity.imageAsset"] | order(_createdAt desc) {
        _id, _createdAt, url, originalFilename, title, description, altText,
        metadata { dimensions { width, height }, size }
      }`,
      {},
      { cache: "no-store" }
    );
    return NextResponse.json(assets);
  } catch {
    return NextResponse.json([]);
  }
}

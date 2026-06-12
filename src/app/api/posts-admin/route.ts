import { getAllPostsAdmin } from "@/lib/sanity";
import { isAuthed } from "@/lib/adminAuth";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAuthed())) return NextResponse.json([], { status: 401 });
  try {
    const posts = await getAllPostsAdmin();
    return NextResponse.json(posts);
  } catch {
    return NextResponse.json([]);
  }
}

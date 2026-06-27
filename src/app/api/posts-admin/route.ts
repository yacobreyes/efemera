import { getAllPostsAdmin } from "@/lib/sanity";
import { isAuthed } from "@/lib/adminAuth";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAuthed())) return NextResponse.json([], { status: 401 });
  try {
    // Full searchable payload — the dashboard hydrates this after its fast,
    // body-free first paint so client-side search works.
    const posts = await getAllPostsAdmin(true);
    return NextResponse.json(posts);
  } catch {
    return NextResponse.json([]);
  }
}

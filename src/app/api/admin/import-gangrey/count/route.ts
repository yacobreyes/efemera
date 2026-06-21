import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  if (!(await isAuthed())) return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production";
  const token = process.env.SANITY_API_READ_TOKEN ?? process.env.SANITY_API_WRITE_TOKEN ?? process.env.SANITY_WRITE_TOKEN;
  if (!projectId) return NextResponse.json({ error: "No Sanity project id" }, { status: 500 });

  const query = encodeURIComponent('count(*[_type=="post" && section=="Gangrey Redux"])');
  const res = await fetch(
    `https://${projectId}.api.sanity.io/v2024-01-01/data/query/${dataset}?query=${query}&returnQuery=false`,
    { headers: token ? { Authorization: `Bearer ${token}` } : {}, cache: "no-store" }
  );
  if (!res.ok) return NextResponse.json({ error: `Sanity ${res.status}` }, { status: 502 });
  const { result } = await res.json();
  return NextResponse.json({ count: result as number });
}

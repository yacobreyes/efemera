import { client } from "@/lib/sanity";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const doc = await client.fetch(
      `*[_type == "welcome" && _id == "welcome"][0]{ headline, body }`,
      {},
      { cache: "no-store" }
    );
    return NextResponse.json(doc ?? null);
  } catch {
    return NextResponse.json(null);
  }
}

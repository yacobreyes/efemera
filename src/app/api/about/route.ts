import { getAboutPage } from "@/lib/sanity";
import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const about = await getAboutPage();
    return NextResponse.json(about ?? null);
  } catch {
    return NextResponse.json(null);
  }
}

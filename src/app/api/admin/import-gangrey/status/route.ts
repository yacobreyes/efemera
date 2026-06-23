import { NextResponse } from "next/server";
import { promises as fs } from "fs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const raw = await fs.readFile("/tmp/gangrey-import-progress.json", "utf8");
    return NextResponse.json(JSON.parse(raw));
  } catch {
    return NextResponse.json({ offset: 0, total: 0, totalWritten: 0, totalParsed: 0, done: false });
  }
}

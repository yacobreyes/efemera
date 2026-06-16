import { NextRequest, NextResponse } from "next/server";
import { writeFile, readFile, mkdir } from "fs/promises";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "newsletters.json");

async function readNewsletters() {
  try {
    const raw = await readFile(FILE, "utf-8");
    return JSON.parse(raw) as object[];
  } catch {
    return [];
  }
}

export async function GET() {
  const newsletters = await readNewsletters();
  return NextResponse.json(newsletters);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const newsletters = await readNewsletters();
  const entry = { id: `nl-${Date.now()}`, createdAt: new Date().toISOString(), ...body };
  newsletters.unshift(entry);
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(FILE, JSON.stringify(newsletters, null, 2));
  return NextResponse.json(entry, { status: 201 });
}

import { NextRequest, NextResponse } from "next/server";
import { writeFile, readFile, mkdir } from "fs/promises";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "newsletter.json");

type Store = { draft: Record<string, unknown> | null; versions: Record<string, unknown>[] };

async function readStore(): Promise<Store> {
  try {
    const raw = await readFile(FILE, "utf-8");
    const parsed = JSON.parse(raw);
    // Migrate old array format → { draft, versions }
    if (Array.isArray(parsed)) return { draft: parsed[0] ?? null, versions: parsed };
    return { draft: parsed.draft ?? null, versions: Array.isArray(parsed.versions) ? parsed.versions : [] };
  } catch {
    return { draft: null, versions: [] };
  }
}

export async function GET() {
  const store = await readStore();
  return NextResponse.json(store);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const store = await readStore();

  const now = new Date().toISOString();
  store.draft = { ...body, updatedAt: now };

  // Append a version snapshot, but skip if identical to the most recent one
  const snapshot = { id: `nl-${Date.now()}`, createdAt: now, ...body };
  const last = store.versions[0];
  const sameAsLast = last && JSON.stringify({ ...last, id: undefined, createdAt: undefined }) === JSON.stringify({ ...snapshot, id: undefined, createdAt: undefined });
  if (!sameAsLast) {
    store.versions.unshift(snapshot);
    store.versions = store.versions.slice(0, 50); // cap history
  }

  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(FILE, JSON.stringify(store, null, 2));
  return NextResponse.json({ ok: true, versions: store.versions }, { status: 200 });
}

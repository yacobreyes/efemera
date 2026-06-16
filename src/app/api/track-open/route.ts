import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function sanityConfig() {
  const token = process.env.SANITY_API_WRITE_TOKEN ?? process.env.SANITY_WRITE_TOKEN;
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production";
  if (!token || !projectId) throw new Error("Missing Sanity config");
  return { token, projectId, dataset };
}

async function mutate(mutations: unknown[]) {
  const { token, projectId, dataset } = sanityConfig();
  const res = await fetch(
    `https://${projectId}.api.sanity.io/v2024-01-01/data/mutate/${dataset}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ mutations }),
    }
  );
  if (!res.ok) throw new Error(`Sanity error: ${await res.text()}`);
}

// 1x1 transparent GIF — Resend's `to` header doesn't expose individual BCC
// opens, so each sent email embeds this pixel with its own subscriber id to
// promote that subscriber from "pending" to "active" on first open.
const PIXEL = Buffer.from("R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==", "base64");

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (id) {
    try {
      await mutate([{ patch: { id, set: { status: "active", lastOpenedAt: new Date().toISOString() } } }]);
    } catch {
      // Subscriber may have unsubscribed/been removed since the email was sent — ignore.
    }
  }
  return new NextResponse(PIXEL, { headers: { "Content-Type": "image/gif", "Cache-Control": "no-store" } });
}

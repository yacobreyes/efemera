import { NextRequest, NextResponse } from "next/server";
import { client } from "@/lib/sanity";

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

// 1x1 transparent GIF — each sent email embeds this pixel with the
// subscriber's id and that send's newsletter id, so we can tell which sends
// a subscriber actually opened (not just whether they opened one, ever).
const PIXEL = Buffer.from("R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==", "base64");

// "active" = opened at least REQUIRED of the last LOOKBACK sends.
// "inactive" = opened none of them (despite LOOKBACK sends having gone out).
// "neutral" = everything in between. Kept consistent with classifyByOpens()
// in src/app/admin/newsletterActions.ts.
const LOOKBACK = 3;
const REQUIRED = 2;
function classifyByOpens(openedCount: number, lookbackCount: number): "active" | "neutral" | "inactive" {
  if (lookbackCount === 0) return "neutral";
  if (openedCount >= REQUIRED) return "active";
  if (openedCount >= 1) return "neutral";
  return "inactive";
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  const nid = req.nextUrl.searchParams.get("nid");

  if (id && nid) {
    try {
      const sub: { openedSends?: string[] } | null = await client.fetch(
        `*[_id == $id][0]{ openedSends }`,
        { id },
        { cache: "no-store" }
      );
      if (sub) {
        const openedSends = Array.from(new Set([...(sub.openedSends ?? []), nid])).slice(-20);

        const recentSends: string[] = await client.fetch(
          `*[_type == "newsletter" && status == "published"] | order(sentAt desc)[0...${LOOKBACK}]._id`,
          {},
          { cache: "no-store" }
        );
        const openedRecent = recentSends.filter(sid => openedSends.includes(sid)).length;
        const status = classifyByOpens(openedRecent, recentSends.length);

        await mutate([{ patch: { id, set: { status, openedSends, lastOpenedAt: new Date().toISOString() } } }]);
      }
    } catch {
      // Subscriber may have been removed since the email was sent — ignore.
    }
  }

  return new NextResponse(PIXEL, { headers: { "Content-Type": "image/gif", "Cache-Control": "no-store" } });
}

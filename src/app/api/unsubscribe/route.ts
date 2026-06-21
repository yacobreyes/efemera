import { NextRequest, NextResponse } from "next/server";

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
  return res.json();
}

// Mirrors the deterministic id used when subscribing.
function subscriberId(email: string) {
  return "subscriber-" + email.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-");
}

// Flips a subscriber to "unsubscribed" so the send route (which targets
// status == "active") skips them. Uses patch on the deterministic id, so an
// address that was never a subscriber simply no-ops.
export async function POST(req: NextRequest) {
  let email = "";
  try {
    const body = await req.json();
    email = String(body.email ?? "").trim();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  try {
    await mutate([
      {
        patch: {
          id: subscriberId(email),
          set: { status: "unsubscribed", unsubscribedAt: new Date().toISOString() },
        },
      },
    ]);
  } catch {
    // Patch fails if the doc doesn't exist — treat as already-not-subscribed.
  }

  return NextResponse.json({ ok: true });
}

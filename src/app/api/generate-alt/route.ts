import { isAuthed } from "@/lib/adminAuth";
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!(await isAuthed())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { imageUrl } = await req.json();
  if (!imageUrl) return NextResponse.json({ error: "No imageUrl" }, { status: 400 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "No ANTHROPIC_API_KEY" }, { status: 500 });

  const client = new Anthropic({ apiKey });
  const msg = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 200,
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "url", url: imageUrl } },
          { type: "text", text: "Write a concise, descriptive alt text for this image in one sentence. Be specific about what you see. Do not start with 'Image of' or 'Photo of'." },
        ],
      },
    ],
  });

  const text = msg.content[0].type === "text" ? msg.content[0].text.trim() : "";
  return NextResponse.json({ altText: text });
}

"use server";

import { parseBody } from "@/lib/parseBody";
import { requireAuth } from "@/lib/adminAuth";
import { client } from "@/lib/sanity";

function sanityConfig() {
  const token = process.env.SANITY_API_WRITE_TOKEN ?? process.env.SANITY_WRITE_TOKEN;
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production";
  if (!token || !projectId) throw new Error("Missing Sanity config — add SANITY_API_WRITE_TOKEN in Vercel env vars");
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

export async function uploadImage(formData: FormData) {
  await requireAuth();
  const { token, projectId, dataset } = sanityConfig();
  const file = formData.get("file") as File;
  if (!file) throw new Error("No file provided");
  const buf = Buffer.from(await file.arrayBuffer());
  const res = await fetch(
    `https://${projectId}.api.sanity.io/v1/assets/images/${dataset}`,
    {
      method: "POST",
      headers: { "Content-Type": file.type, Authorization: `Bearer ${token}` },
      body: buf,
    }
  );
  if (!res.ok) {
    const body = await res.text();
    console.error("Sanity upload failed", res.status, body);
    throw new Error(`Upload failed (${res.status}): ${body}`);
  }
  const data = await res.json();
  return { assetId: data.document._id as string, url: data.document.url as string };
}

export async function createDraft(providedSlug?: string): Promise<{ slug: string }> {
  await requireAuth();
  const { token, projectId, dataset } = sanityConfig();
  const slug = providedSlug ?? `untitled-${Date.now()}`;
  const doc = {
    _id: `post-${slug}`,
    _type: "post",
    headline: "",
    subheadline: "",
    slug: { _type: "slug", current: slug },
    section: "Narratives",
    byline: "Yacob Reyes",
    date: new Date().toISOString().slice(0, 10),
    body: [],
    status: "draft",
  };
  const res = await fetch(
    `https://${projectId}.api.sanity.io/v2024-01-01/data/mutate/${dataset}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ mutations: [{ createOrReplace: doc }] }),
    }
  );
  if (!res.ok) throw new Error(`Sanity error: ${await res.text()}`);
  return { slug };
}

// Creates a standalone draft post from a newsletter card so it can be edited and
// published on its own. Returns the new slug; the caller links to the editor.
export async function createPostFromNewsletterCard(input: {
  headline: string;
  body: unknown[];
  byline?: string;
  section?: string;
  image?: { assetId: string; caption?: string; alt?: string } | null;
}): Promise<{ slug: string }> {
  await requireAuth();
  const base = (input.headline || "untitled")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "untitled";
  const slug = `${base}-${Date.now().toString(36)}`;
  const doc: Record<string, unknown> = {
    _id: `post-${slug}`,
    _type: "post",
    headline: input.headline || "",
    subheadline: "",
    slug: { _type: "slug", current: slug },
    section: input.section || "Narratives",
    byline: input.byline || "Yacob Reyes",
    date: new Date().toISOString().slice(0, 10),
    body: Array.isArray(input.body) ? input.body : [],
    status: "draft",
  };
  if (input.image?.assetId) {
    doc.image = {
      _type: "image",
      asset: { _type: "reference", _ref: input.image.assetId },
      ...(input.image.caption ? { caption: input.image.caption } : {}),
      ...(input.image.alt ? { alt: input.image.alt } : {}),
    };
  }
  await mutate([{ createOrReplace: doc }]);
  return { slug };
}

export async function savePost(formData: FormData) {
  await requireAuth();
  const id = formData.get("id") as string;
  const headline = formData.get("headline") as string;
  const subheadline = formData.get("subheadline") as string;
  const byline = (formData.get("byline") as string) || "Yacob Reyes";
  const slug = formData.get("slug") as string;
  const section = formData.get("section") as string;
  const date = formData.get("date") as string;
  const bodyRaw = formData.get("body") as string;
  const imageAssetId = formData.get("imageAssetId") as string | null;
  const imageCaption = formData.get("imageCaption") as string | null;
  const imageAlt = formData.get("imageAlt") as string | null;
  const status = (formData.get("status") as string) || "draft";
  const scheduledAt = (formData.get("scheduledAt") as string) || null;
  const shouldSnapshot = formData.get("snapshot") === "1";
  const seoHeadline = (formData.get("seoHeadline") as string) || null;
  const socialHeadline = (formData.get("socialHeadline") as string) || null;
  const socialDescription = (formData.get("socialDescription") as string) || null;

  let body: unknown;
  try {
    const parsed = JSON.parse(bodyRaw);
    if (Array.isArray(parsed)) body = parsed;
    else body = parseBody(bodyRaw);
  } catch {
    body = parseBody(bodyRaw);
  }

  const doc: Record<string, unknown> = {
    _id: id || `post-${slug}`,
    _type: "post",
    headline, subheadline,
    slug: { _type: "slug", current: slug },
    section, byline, date, body, status,
    ...(scheduledAt ? { scheduledAt } : {}),
    ...(seoHeadline ? { seoHeadline } : {}),
    ...(socialHeadline ? { socialHeadline } : {}),
    ...(socialDescription ? { socialDescription } : {}),
  };

  if (imageAssetId) {
    doc.image = {
      _type: "image",
      asset: { _type: "reference", _ref: imageAssetId },
      ...(imageCaption ? { caption: imageCaption } : {}),
      ...(imageAlt ? { alt: imageAlt } : {}),
    };
  }

  await mutate([{ createOrReplace: doc }]);
  await snapshotVersion({
    postId: doc._id as string,
    slug,
    type: status === "published" ? "publish" : "autosave",
    headline, subheadline,
    body: Array.isArray(body) ? body : [],
  });
  return { slug };
}

function portableWordCount(body: unknown[]): number {
  const text = body
    .filter((b): b is { _type: string; children?: { text?: string }[] } => typeof b === "object" && b !== null && (b as { _type?: string })._type === "block")
    .map(b => (b.children ?? []).map(c => c.text ?? "").join(""))
    .join(" ");
  return text.trim().split(/\s+/).filter(Boolean).length;
}

interface VersionInput { postId: string; slug: string; type: "autosave" | "publish"; headline: string; subheadline: string; body: unknown[]; }

// Saves a snapshot of the post as a separate postVersion document, then prunes
// to the most recent 20 per post. Stored in Sanity so history survives across devices.
async function snapshotVersion({ postId, slug, type, headline, subheadline, body }: VersionInput) {
  try {
    // Skip if nothing changed since the most recent version (avoids empty saves).
    const latest = await client.fetch(
      `*[_type == "postVersion" && slug == $slug] | order(savedAt desc)[0]{ headline, subheadline, body }`,
      { slug },
      { cache: "no-store" }
    );
    if (latest &&
        latest.headline === headline &&
        latest.subheadline === subheadline &&
        JSON.stringify(latest.body ?? []) === JSON.stringify(body)) {
      return;
    }

    const versionDoc = {
      _id: `version-${slug}-${Date.now()}`,
      _type: "postVersion",
      postId, slug, type,
      savedAt: new Date().toISOString(),
      wordCount: portableWordCount(body),
      headline, subheadline, body,
    };
    // Existing versions at index >= 19 get pruned once this new one is added.
    const stale: string[] = await client.fetch(
      `*[_type == "postVersion" && slug == $slug] | order(savedAt desc) [19...100]._id`,
      { slug },
      { cache: "no-store" }
    );
    await mutate([
      { createOrReplace: versionDoc },
      ...stale.map(id => ({ delete: { id } })),
    ]);
  } catch (err) {
    // Version history is best-effort — never block a save on it.
    console.error("snapshotVersion failed", err);
  }
}

export interface PostVersion {
  _id: string;
  savedAt: string;
  type: "autosave" | "publish";
  wordCount?: number;
  headline: string;
  subheadline: string;
  body: import("@portabletext/types").PortableTextBlock[];
}

export async function getVersions(slug: string): Promise<PostVersion[]> {
  await requireAuth();
  return client.fetch(
    `*[_type == "postVersion" && slug == $slug] | order(savedAt desc){ _id, savedAt, type, wordCount, headline, subheadline, body }`,
    { slug },
    { cache: "no-store" }
  );
}

export async function deletePost(id: string) {
  await requireAuth();
  await mutate([{ delete: { id } }]);
}

export async function unpublishPost(id: string) {
  await requireAuth();
  await mutate([{ patch: { id, set: { status: "draft" } } }]);
}

export async function trashPost(id: string) {
  await requireAuth();
  await mutate([{ patch: { id, set: { status: "trashed" } } }]);
}

export async function restorePost(id: string) {
  await requireAuth();
  await mutate([{ patch: { id, set: { status: "draft" } } }]);
}

export async function deleteMediaAsset(assetId: string) {
  await requireAuth();
  await mutate([{ delete: { id: assetId } }]);
}

export async function updateMediaAsset(assetId: string, fields: { title?: string; description?: string; altText?: string }) {
  await requireAuth();
  await mutate([{ patch: { id: assetId, set: fields } }]);
}

export async function saveAbout(formData: FormData) {
  await requireAuth();
  const raw = formData.get("body") as string;
  let body: unknown;
  try {
    const parsed = JSON.parse(raw);
    body = Array.isArray(parsed) ? parsed : parseBody(raw);
  } catch {
    body = parseBody(raw);
  }
  await mutate([{ createOrReplace: { _id: "about", _type: "about", body } }]);
}

const CLOUD_DRAFT_ID = "admin-autosave";

export async function saveDraftToCloud(data: string) {
  await requireAuth();
  await mutate([{ createOrReplace: { _id: CLOUD_DRAFT_ID, _type: "adminDraft", data, ts: Date.now() } }]);
}

export async function loadDraftFromCloud(): Promise<{ data: string; ts: number } | null> {
  await requireAuth();
  const doc = await client.fetch(
    `*[_id == $id][0]{ data, ts }`,
    { id: CLOUD_DRAFT_ID },
    { cache: "no-store" }
  );
  return doc?.data ? { data: doc.data, ts: doc.ts ?? 0 } : null;
}

export async function clearCloudDraft() {
  // no auth check — safe to call on mount to purge stale data
  try { await mutate([{ delete: { id: CLOUD_DRAFT_ID } }]); } catch {}
}

export async function saveWelcome(headline: string, body: string) {
  await requireAuth();
  await mutate([{ createOrReplace: { _id: "welcome", _type: "welcome", headline, body } }]);
}

export async function saveLately(formData: FormData) {
  await requireAuth();
  const reading = formData.get("reading") as string;
  const readingAuthor = formData.get("readingAuthor") as string;
  const readingUrl = formData.get("readingUrl") as string;
  const listening = formData.get("listening") as string;
  const listeningArtist = formData.get("listeningArtist") as string;
  const listeningUrl = formData.get("listeningUrl") as string;
  const watching = formData.get("watching") as string;
  const watchingUrl = formData.get("watchingUrl") as string;
  const doc: Record<string, unknown> = {
    _id: "lately", _type: "lately",
    reading, readingAuthor, readingUrl, listening, listeningArtist, listeningUrl, watching, watchingUrl,
  };

  await mutate([{ createOrReplace: doc }]);
}

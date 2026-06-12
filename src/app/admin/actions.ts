"use server";

import { parseBody } from "@/lib/parseBody";

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
  return { assetId: data.document._id as string };
}

export async function savePost(formData: FormData) {
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
  const status = (formData.get("status") as string) || "draft";

  const body = parseBody(bodyRaw);

  const doc: Record<string, unknown> = {
    _id: id || `post-${slug}`,
    _type: "post",
    headline, subheadline,
    slug: { _type: "slug", current: slug },
    section, byline, date, body, status,
  };

  if (imageAssetId) {
    doc.image = {
      _type: "image",
      asset: { _type: "reference", _ref: imageAssetId },
      ...(imageCaption ? { caption: imageCaption } : {}),
    };
  }

  await mutate([{ createOrReplace: doc }]);
  return { slug };
}

export async function deletePost(id: string) {
  await mutate([{ delete: { id } }]);
}

export async function saveAbout(formData: FormData) {
  const body = parseBody(formData.get("body") as string);
  await mutate([{ createOrReplace: { _id: "about", _type: "about", body } }]);
}

export async function saveLately(formData: FormData) {
  const reading = formData.get("reading") as string;
  const readingAuthor = formData.get("readingAuthor") as string;
  const obsessed = formData.get("obsessed") as string;
  const photoAssetId = formData.get("photoAssetId") as string | null;
  const photoCaption = formData.get("photoCaption") as string | null;

  const doc: Record<string, unknown> = {
    _id: "lately", _type: "lately",
    reading, readingAuthor, obsessed,
  };

  if (photoAssetId) {
    doc.photo = {
      _type: "image",
      asset: { _type: "reference", _ref: photoAssetId },
      ...(photoCaption ? { caption: photoCaption } : {}),
    };
  }

  await mutate([{ createOrReplace: doc }]);
}

// Shared server-side Sanity write helpers (mutate + asset upload). Used by the
// admin server actions so the write-token boilerplate lives in one place.

export function sanityConfig() {
  const token = process.env.SANITY_API_WRITE_TOKEN ?? process.env.SANITY_WRITE_TOKEN;
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production";
  if (!token || !projectId) throw new Error("Missing Sanity config — add SANITY_API_WRITE_TOKEN in Vercel env vars");
  return { token, projectId, dataset };
}

export async function sanityMutate(mutations: unknown[]) {
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

export async function uploadImageAsset(file: File): Promise<{ assetId: string; url: string }> {
  const { token, projectId, dataset } = sanityConfig();
  const buf = Buffer.from(await file.arrayBuffer());
  const res = await fetch(
    `https://${projectId}.api.sanity.io/v1/assets/images/${dataset}`,
    { method: "POST", headers: { "Content-Type": file.type, Authorization: `Bearer ${token}` }, body: buf }
  );
  if (!res.ok) throw new Error(`Upload failed (${res.status}): ${await res.text()}`);
  const data = await res.json();
  return { assetId: data.document._id as string, url: data.document.url as string };
}

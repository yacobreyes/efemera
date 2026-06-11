"use server";

export async function savePost(formData: FormData) {
  const token = process.env.SANITY_WRITE_TOKEN;
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production";

  if (!token || !projectId) throw new Error("Missing Sanity config");

  const id = formData.get("id") as string;
  const headline = formData.get("headline") as string;
  const subheadline = formData.get("subheadline") as string;
  const slug = formData.get("slug") as string;
  const section = formData.get("section") as string;
  const date = formData.get("date") as string;
  const bodyRaw = formData.get("body") as string;

  const body = bodyRaw
    .split(/\n\n+/)
    .filter(p => p.trim())
    .map((text, i) => ({
      _type: "block",
      _key: `b${i}`,
      style: "normal",
      markDefs: [],
      children: [{ _type: "span", _key: `s${i}`, text: text.trim(), marks: [] }],
    }));

  const doc = {
    _id: id || `post-${slug}`,
    _type: "post",
    headline,
    subheadline,
    slug: { _type: "slug", current: slug },
    section,
    byline: "Yacob Reyes",
    date,
    body,
  };

  const res = await fetch(
    `https://${projectId}.api.sanity.io/v2024-01-01/data/mutate/${dataset}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ mutations: [{ createOrReplace: doc }] }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Sanity error: ${err}`);
  }

  return { slug };
}

export async function deletePost(id: string) {
  const token = process.env.SANITY_WRITE_TOKEN;
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production";

  await fetch(
    `https://${projectId}.api.sanity.io/v2024-01-01/data/mutate/${dataset}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ mutations: [{ delete: { id } }] }),
    }
  );
}

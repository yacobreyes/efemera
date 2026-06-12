import { ImageResponse } from "next/og";
import { getPost, urlFor } from "@/lib/sanity";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPost(slug);

  const headline = post?.headline ?? "Efemera";
  const subheadline = post?.subheadline ?? "";
  const section = post?.section ?? "";
  const photoUrl = post?.image?.asset
    ? urlFor(post.image.asset).width(560).height(630).fit("crop").auto("format").url()
    : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#8B0000",
          display: "flex",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: photoUrl ? "70px 60px" : "80px 90px",
          }}
        >
          {section && (
            <div style={{ fontSize: 20, fontWeight: 700, color: "rgba(255,255,255,0.6)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 28 }}>
              {section}
            </div>
          )}
          <div style={{ fontSize: photoUrl ? 56 : 72, fontWeight: 700, color: "white", lineHeight: 1.1, marginBottom: 28 }}>
            {headline}
          </div>
          {subheadline && (
            <div style={{ fontSize: photoUrl ? 26 : 32, color: "rgba(255,255,255,0.75)", lineHeight: 1.4 }}>
              {subheadline}
            </div>
          )}
          <div style={{ marginTop: 40, fontSize: 22, color: "rgba(255,255,255,0.45)", letterSpacing: "0.1em" }}>
            efemera
          </div>
        </div>
        {photoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoUrl}
            alt=""
            width={460}
            height={630}
            style={{ width: 460, height: 630, objectFit: "cover" }}
          />
        )}
      </div>
    ),
    { ...size }
  );
}

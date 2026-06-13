import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#8B0000",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`${process.env.NEXT_PUBLIC_SITE_URL ?? "https://efemera.vercel.app"}/wordmark.png`}
          alt="efemera"
          style={{ width: 520, objectFit: "contain" }}
        />
      </div>
    ),
    { width: 1200, height: 630 }
  );
}

import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#b8b8ba",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Georgia, serif",
        }}
      >
        <div style={{ fontSize: 96, fontWeight: 400, color: "#000000", letterSpacing: "-0.01em" }}>
          Gangrey Magazine
        </div>
      </div>
    ),
    { ...size }
  );
}

import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
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
        <div style={{ fontSize: 22, fontWeight: 400, color: "#000000", lineHeight: 1 }}>
          G
        </div>
      </div>
    ),
    { ...size }
  );
}

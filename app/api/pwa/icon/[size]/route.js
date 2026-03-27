import { ImageResponse } from "next/og";

export const runtime = "nodejs";

export async function GET(request, { params }) {
  const resolvedParams = await params;
  const requestedSize = Number.parseInt(resolvedParams.size ?? "192", 10);
  const size = Number.isFinite(requestedSize) ? Math.min(Math.max(requestedSize, 96), 1024) : 192;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(180deg, #121212 0%, #0A0A0A 100%)",
          color: "#F5F5F5",
          border: "2px solid rgba(245,245,245,0.24)",
          borderRadius: "22%",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            width: "62%",
            height: "62%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "50%",
            border: "2px solid rgba(229,229,229,0.24)",
            background: "rgba(245,245,245,0.04)",
            fontSize: size * 0.34,
            fontFamily: "Georgia, serif",
            fontWeight: 600,
            letterSpacing: "-0.04em",
          }}
        >
          Ω
        </div>
        {size >= 256 ? (
          <div
            style={{
              marginTop: size * 0.055,
              fontSize: size * 0.08,
              letterSpacing: "0.24em",
              textTransform: "uppercase",
              color: "#C0C0C0",
            }}
          >
            OMEGA FIT
          </div>
        ) : null}
      </div>
    ),
    {
      width: size,
      height: size,
    },
  );
}

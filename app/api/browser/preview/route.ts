import { captureBrowserPreview } from "@/lib/browser-preview";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const focusUrl = params.get("focusUrl")?.trim() || undefined;
  const viewportWidthRaw = params.get("viewportWidth");
  const viewportHeightRaw = params.get("viewportHeight");
  const viewportWidth = viewportWidthRaw ? Number.parseInt(viewportWidthRaw, 10) : undefined;
  const viewportHeight = viewportHeightRaw ? Number.parseInt(viewportHeightRaw, 10) : undefined;
  const qualityRaw = params.get("quality");
  const quality = qualityRaw ? Number.parseInt(qualityRaw, 10) : undefined;
  const preview = await captureBrowserPreview({
    focusUrl,
    viewportWidth: Number.isFinite(viewportWidth) ? viewportWidth : undefined,
    viewportHeight: Number.isFinite(viewportHeight) ? viewportHeight : undefined,
    quality: Number.isFinite(quality) ? quality : undefined,
  });

  if (!preview) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "No browser tab open yet. Send a message and the agent will navigate — the live view updates automatically.",
      },
      { status: 503 },
    );
  }

  return NextResponse.json({ ok: true, preview });
}

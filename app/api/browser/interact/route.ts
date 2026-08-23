import { performBrowserInteract } from "@/lib/browser-interact";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type InteractBody = {
  action?: string;
  focusUrl?: string;
  x?: number;
  y?: number;
  text?: string;
  key?: string;
  deltaY?: number;
  viewportWidth?: number;
  viewportHeight?: number;
};

export async function POST(request: Request) {
  let body: InteractBody;

  try {
    body = (await request.json()) as InteractBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const action = body.action?.trim();
  if (
    action !== "click" &&
    action !== "type" &&
    action !== "scroll" &&
    action !== "keypress"
  ) {
    return NextResponse.json(
      { ok: false, error: "action must be click, type, scroll, or keypress" },
      { status: 400 },
    );
  }

  const result = await performBrowserInteract({
    action,
    focusUrl: body.focusUrl?.trim() || undefined,
    x: body.x,
    y: body.y,
    text: body.text,
    key: body.key?.trim() || undefined,
    deltaY: body.deltaY,
    viewportWidth: body.viewportWidth,
    viewportHeight: body.viewportHeight,
  });

  if (!result) {
    return NextResponse.json(
      { ok: false, error: "Browser interaction failed — no tab open or CDP unreachable" },
      { status: 503 },
    );
  }

  return NextResponse.json({ ...result });
}

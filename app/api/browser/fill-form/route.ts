import { fillBrowserForm } from "@/lib/browser-fill-form";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type FillFormBody = {
  focusUrl?: string;
  fields?: Record<string, string>;
  viewportWidth?: number;
  viewportHeight?: number;
};

export async function POST(request: Request) {
  let body: FillFormBody;

  try {
    body = (await request.json()) as FillFormBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const fields = body.fields;
  if (!fields || typeof fields !== "object" || Object.keys(fields).length === 0) {
    return NextResponse.json({ ok: false, error: "fields must be a non-empty object" }, {
      status: 400,
    });
  }

  const sanitized: Record<string, string> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (typeof key === "string" && typeof value === "string") {
      sanitized[key] = value;
    }
  }

  const result = await fillBrowserForm({
    focusUrl: body.focusUrl?.trim() || undefined,
    fields: sanitized,
    viewportWidth: body.viewportWidth,
    viewportHeight: body.viewportHeight,
  });

  if (!result) {
    return NextResponse.json(
      { ok: false, error: "Form fill failed — no tab open or CDP unreachable" },
      { status: 503 },
    );
  }

  return NextResponse.json({ ...result });
}

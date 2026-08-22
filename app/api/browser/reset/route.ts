import { resetBrowserTabs } from "@/lib/browser-reset";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    await resetBrowserTabs();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Could not reset browser tabs" },
      { status: 503 },
    );
  }
}

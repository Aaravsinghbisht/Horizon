import { abortEvaluation } from "@/lib/security/evaluate";

export const dynamic = "force-dynamic";

type StopBody = {
  evalId?: string;
};

export async function POST(request: Request) {
  let body: StopBody;

  try {
    body = (await request.json()) as StopBody;
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const evalId = body.evalId?.trim();
  if (!evalId) {
    return Response.json({ ok: false, error: "evalId is required" }, { status: 400 });
  }

  abortEvaluation(evalId);
  return Response.json({ ok: true });
}

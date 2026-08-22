#!/usr/bin/env python3
"""Full Compositer workflow test — shopping journey with HITL checkpoints."""

from __future__ import annotations

import json
import sys
import threading
import time
import urllib.error
import urllib.request

BASE = "http://127.0.0.1:3000"
TIMEOUT = 360


def http_json(method: str, path: str, body: dict | None = None, timeout: int = 30) -> dict:
    data = None
    headers = {"Content-Type": "application/json"}
    if body is not None:
        data = json.dumps(body).encode()
    req = urllib.request.Request(f"{BASE}{path}", data=data, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode())


def find_input_requests(events: list[dict]) -> list[dict]:
    requests: list[dict] = []
    for evt in events:
        if evt.get("type") == "input.requested":
            for req in evt.get("data", {}).get("requests", []):
                requests.append(req)
        if evt.get("type") == "session.waiting":
            for req in evt.get("data", {}).get("requests", []):
                requests.append(req)
    return requests


def final_assistant_text(events: list[dict]) -> str:
    text = ""
    for evt in events:
        if evt.get("type") == "message.completed":
            text = evt.get("data", {}).get("message", "")
        elif evt.get("type") == "message.appended":
            text = evt.get("data", {}).get("messageSoFar", text)
    return text.strip()


def test_infrastructure() -> tuple[bool, str]:
    lines: list[str] = []
    ok = True

    try:
        health = http_json("GET", "/eve/v1/health")
        if not (health.get("ok") and health.get("status") == "ready"):
            ok = False
            lines.append(f"health bad: {health}")
        else:
            lines.append("eve health: ready")
    except Exception as exc:
        return False, f"health unreachable: {exc}"

    preview = http_json("GET", "/api/browser/preview?viewportWidth=600&viewportHeight=800")
    if preview.get("ok"):
        vp = preview.get("preview", {}).get("viewport", {})
        tall = vp.get("height", 0) > vp.get("width", 1) * 0.9
        lines.append(f"preview viewport: {vp} (tall={tall})")
        if not tall:
            ok = False
            lines.append("FAIL: viewport should be taller than wide for browser pane")
    else:
        lines.append("preview: no tab yet (ok for fresh chrome)")

    return ok, "\n".join(lines)


def run_shopping_session() -> tuple[bool, str]:
    """Simulate: buy black shoes on Amazon under 5000 — expect HITL at login or search."""
    print("\n--- Full shopping workflow ---")

    task = (
        "Load browser-use and human-help skills. "
        "Task: find black running shoes on Amazon India under ₹5000. "
        "Steps: open amazon.in, pause at login with ask_question options for me to sign in, "
        "then search, then MUST ask_question with product options before buying anything. "
        "Do not complete without asking me to pick a product."
    )

    create = http_json("POST", "/eve/v1/session", {"message": task})
    session_id = create.get("sessionId")
    if not session_id:
        return False, f"session create failed: {create}"

    print(f"session: {session_id}")

    events: list[dict] = []
    lock = threading.Lock()
    stream_done = threading.Event()
    hitl_count = 0
    responded_requests: set[str] = set()

    def stream_reader() -> None:
        url = f"{BASE}/eve/v1/session/{session_id}/stream"
        req = urllib.request.Request(url)
        try:
            with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
                for raw in resp:
                    line = raw.decode().strip()
                    if not line:
                        continue
                    try:
                        evt = json.loads(line)
                    except json.JSONDecodeError:
                        continue
                    with lock:
                        events.append(evt)
                    t = evt.get("type", "")
                    if t in ("turn.failed", "turn.cancelled"):
                        stream_done.set()
                        break
                    # don't break on turn.completed — agent may continue after HITL respond
                    if t == "session.waiting":
                        pass
        except Exception as exc:
            print(f"stream ended: {exc}")
        finally:
            stream_done.set()

    threading.Thread(target=stream_reader, daemon=True).start()

    deadline = time.time() + TIMEOUT
    lines: list[str] = []
    ok = True
    saw_browser = False
    saw_options_hitl = False
    saw_product_options = False
    last_event_count = 0
    idle_since = time.time()

    while time.time() < deadline:
        with lock:
            event_count = len(events)
            pending = [r for r in find_input_requests(events) if r.get("requestId") not in responded_requests]

        for req in pending:
            hitl_count += 1
            prompt = req.get("prompt", "")
            options = req.get("options") or []
            rid = req.get("requestId", "")
            lines.append(f"HITL #{hitl_count}: {prompt[:100]!r}")
            lines.append(f"  options: {[o.get('label', '')[:40] for o in options]}")

            if options:
                saw_options_hitl = True
                lower_labels = " ".join(o.get("label", "").lower() for o in options)
                if any(k in lower_labels for k in ("shoe", "product", "nike", "campus", "₹", "buy", "cart", "search again")):
                    saw_product_options = True
                    pick = options[0]
                    lines.append(f"  -> picking product option: {pick.get('label', '')[:50]}")
                elif any(k in prompt.lower() for k in ("login", "sign in", "log in")):
                    pick = next((o for o in options if "continue" in o.get("label", "").lower() or "done" in o.get("id", "")), options[0])
                    lines.append(f"  -> simulating login done: {pick.get('label', '')}")
                else:
                    pick = options[0]
                    lines.append(f"  -> picking first option: {pick.get('label', '')[:50]}")

                responded_requests.add(rid)
                follow = http_json(
                    "POST",
                    f"/eve/v1/session/{session_id}",
                    {"inputResponses": [{"requestId": rid, "optionId": pick["id"]}]},
                )
                if not follow.get("ok"):
                    ok = False
                    lines.append(f"  FAIL respond: {follow}")
                idle_since = time.time()
            elif req.get("allowFreeform"):
                responded_requests.add(rid)
                follow = http_json(
                    "POST",
                    f"/eve/v1/session/{session_id}",
                    {"inputResponses": [{"requestId": rid, "text": "999888"}]},
                )
                lines.append("  -> sent freeform OTP")
                if not follow.get("ok"):
                    ok = False

        with lock:
            for evt in events:
                if evt.get("type") == "action.result":
                    result = evt.get("data", {}).get("result", {})
                    if result.get("toolName") == "bash":
                        saw_browser = True
                if evt.get("type") == "turn.failed":
                    ok = False
                    lines.append(f"FAIL turn.failed: {evt.get('data', {}).get('message', '')[:200]}")

        if event_count > last_event_count:
            last_event_count = event_count
            idle_since = time.time()

        with lock:
            failed = any(e.get("type") == "turn.failed" for e in events)

        if failed:
            ok = False
            break

        # Stop after 30s idle with at least one HITL handled
        if hitl_count >= 1 and time.time() - idle_since > 45:
            break

        if hitl_count >= 2 and saw_product_options:
            break

        time.sleep(0.5)

    with lock:
        final = final_assistant_text(events)
        failed = any(e.get("type") == "turn.failed" for e in events)
        completed = any(e.get("type") == "turn.completed" for e in events)

    lines.append(f"browser commands: {saw_browser}")
    lines.append(f"options HITL: {saw_options_hitl} (count={hitl_count})")
    lines.append(f"product options HITL: {saw_product_options}")
    lines.append(f"turn.completed: {completed}, turn.failed: {failed}")
    lines.append(f"final message: {final[:300]!r}")

  # Test interact during a preview
    try:
        preview = http_json("GET", "/api/browser/preview?viewportWidth=600&viewportHeight=900")
        if preview.get("ok"):
            vp = preview.get("preview", {}).get("viewport", {})
            cx, cy = vp.get("width", 600) // 2, vp.get("height", 900) // 2
            interact = http_json(
                "POST",
                "/api/browser/interact",
                {"action": "click", "x": cx, "y": cy, "viewportWidth": vp.get("width"), "viewportHeight": vp.get("height")},
            )
            lines.append(f"interact click: ok={interact.get('ok')} url={str(interact.get('url', ''))[:60]}")
        else:
            lines.append("interact: skipped (no preview)")
    except Exception as exc:
        lines.append(f"interact error: {exc}")

    session_ok = saw_browser and saw_options_hitl and hitl_count >= 1 and not failed
    if not saw_product_options and hitl_count >= 2:
        lines.append("NOTE: product pick HITL not seen — agent may still be at login/search")

    return session_ok and ok, "\n".join(lines)


def main() -> int:
    print("=" * 60)
    print("COMPOSITER FULL WORKFLOW TEST")
    print("=" * 60)

    results: list[tuple[str, bool, str]] = []

    infra_ok, infra_detail = test_infrastructure()
    results.append(("Infrastructure", infra_ok, infra_detail))
    print(f"\n[{'PASS' if infra_ok else 'FAIL'}] Infrastructure\n{infra_detail}")

    shop_ok, shop_detail = run_shopping_session()
    results.append(("Shopping workflow", shop_ok, shop_detail))
    print(f"\n[{'PASS' if shop_ok else 'FAIL'}] Shopping workflow\n{shop_detail}")

    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    all_ok = True
    for name, ok, _ in results:
        status = "PASS" if ok else "FAIL"
        print(f"  [{status}] {name}")
        if not ok:
            all_ok = False

    print("=" * 60)
    print("ALL PASSED" if all_ok else "SOME FAILED")
    return 0 if all_ok else 1


if __name__ == "__main__":
    sys.exit(main())

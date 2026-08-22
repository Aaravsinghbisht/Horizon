#!/usr/bin/env python3
"""End-to-end Compositer verification against local dev server."""

import json
import sys
import threading
import time
import urllib.error
import urllib.request

BASE = "http://127.0.0.1:3000"
TIMEOUT = 300


def http_json(method: str, path: str, body: dict | None = None) -> dict:
    data = None
    headers = {"Content-Type": "application/json"}
    if body is not None:
        data = json.dumps(body).encode()
    req = urllib.request.Request(f"{BASE}{path}", data=data, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode())


def stream_session(session_id: str, timeout_s: int = TIMEOUT) -> list[dict]:
    url = f"{BASE}/eve/v1/session/{session_id}/stream"
    events: list[dict] = []
    start = time.time()
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req, timeout=timeout_s) as resp:
        for raw in resp:
            if time.time() - start > timeout_s:
                break
            line = raw.decode().strip()
            if not line:
                continue
            try:
                events.append(json.loads(line))
            except json.JSONDecodeError:
                continue
            evt_type = events[-1].get("type", "")
            if evt_type in ("session.waiting", "turn.failed", "turn.cancelled"):
                if evt_type == "session.waiting":
                    break
    return events


def extract_bash_stdout(events: list[dict]) -> list[str]:
    out = []
    for evt in events:
        if evt.get("type") != "action.result":
            continue
        result = evt.get("data", {}).get("result", {})
        if result.get("toolName") != "bash":
            continue
        output = result.get("output", {})
        if isinstance(output, dict) and output.get("stdout"):
            out.append(output["stdout"])
    return out


def final_assistant_text(events: list[dict]) -> str:
    text = ""
    for evt in events:
        if evt.get("type") == "message.completed":
            text = evt.get("data", {}).get("message", "")
        elif evt.get("type") == "message.appended":
            text = evt.get("data", {}).get("messageSoFar", text)
    return text.strip()


def find_input_requests(events: list[dict]) -> list[dict]:
    requests = []
    for evt in events:
        if evt.get("type") == "input.requested":
            for req in evt.get("data", {}).get("requests", []):
                requests.append(req)
        if evt.get("type") == "session.waiting":
            for req in evt.get("data", {}).get("requests", []):
                requests.append(req)
    return requests


def test_health() -> bool:
    d = http_json("GET", "/eve/v1/health")
    ok = d.get("ok") and d.get("status") == "ready"
    print(f"[{'PASS' if ok else 'FAIL'}] eve health: {d}")
    return ok


def test_browser_preview() -> bool:
    d = http_json("GET", "/api/browser/preview?viewportWidth=480")
    preview = d.get("preview", {})
    viewport = preview.get("viewport", {})
    ok = (
        d.get("ok")
        and len(preview.get("image", "")) > 1000
        and viewport.get("width", 0) >= 320
        and viewport.get("height", 0) >= 200
    )
    print(
        f"[{'PASS' if ok else 'FAIL'}] browser preview: url={preview.get('url')} "
        f"title={preview.get('title')} viewport={viewport} "
        f"image_len={len(preview.get('image', ''))}"
    )
    return ok


def test_browser_interact() -> bool:
    preview = http_json("GET", "/api/browser/preview")
    if not preview.get("ok"):
        print("[SKIP] browser interact: no preview tab available")
        return True

    viewport = preview.get("preview", {}).get("viewport", {"width": 1280, "height": 800})
    cx = viewport.get("width", 1280) // 2
    cy = viewport.get("height", 800) // 2

    d = http_json(
        "POST",
        "/api/browser/interact",
        {
            "action": "click",
            "x": cx,
            "y": cy,
            "viewportWidth": viewport.get("width", 1280),
        },
    )
    ok = d.get("ok") and bool(d.get("url"))
    print(
        f"[{'PASS' if ok else 'FAIL'}] browser interact click: url={d.get('url')} "
        f"title={d.get('title', '')[:60]!r}"
    )
    return ok


def test_browser_agent_task() -> bool:
    print("\n--- Browser automation test ---")
    create = http_json(
        "POST",
        "/eve/v1/session",
        {
            "message": (
                "Load browser-use skill. Open https://example.com with browser-use "
                "(new_tab, wait_for_load, page_info). Reply with ONLY the page title text."
            )
        },
    )
    session_id = create.get("sessionId")
    if not session_id:
        print(f"[FAIL] session create: {create}")
        return False
    print(f"session: {session_id}")

    events = stream_session(session_id, timeout_s=240)
    bash_out = extract_bash_stdout(events)
    final = final_assistant_text(events)
    failed = any(e.get("type") == "turn.failed" for e in events)

    has_example = any(
        "example" in s.lower() and "domain" in s.lower() for s in bash_out
    ) or "example domain" in final.lower()

    print(f"bash_outputs: {len(bash_out)}")
    if bash_out:
        print(f"  last bash stdout snippet: {bash_out[-1][:120]!r}")
    print(f"final message: {final[:200]!r}")
    ok = not failed and has_example
    print(f"[{'PASS' if ok else 'FAIL'}] browser agent navigated example.com")
    return ok


def test_hitl_ask_question() -> bool:
    print("\n--- Human-in-the-loop test ---")
    create = http_json(
        "POST",
        "/eve/v1/session",
        {
            "message": (
                "Use ask_question immediately: prompt 'Enter test OTP for verification', "
                "allowFreeform true. After I answer, reply confirming the OTP I gave."
            )
        },
    )
    session_id = create.get("sessionId")
    if not session_id:
        print(f"[FAIL] session create: {create}")
        return False
    print(f"session: {session_id}")

    events: list[dict] = []
    lock = threading.Lock()
    stream_done = threading.Event()

    def stream_reader() -> None:
        url = f"{BASE}/eve/v1/session/{session_id}/stream"
        req = urllib.request.Request(url)
        try:
            with urllib.request.urlopen(req, timeout=180) as resp:
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
                    if evt.get("type") in ("turn.completed", "turn.failed"):
                        stream_done.set()
                        break
        except Exception as exc:
            print(f"stream reader ended: {exc}")
        finally:
            stream_done.set()

    threading.Thread(target=stream_reader, daemon=True).start()

    request_id = None
    deadline = time.time() + 90
    while time.time() < deadline:
        with lock:
            pending = find_input_requests(events)
        if pending:
            request_id = pending[0].get("requestId")
            prompt = pending[0].get("prompt", "")
            print(f"pending request: kind={pending[0].get('kind')} prompt={prompt[:80]!r}")
            break
        time.sleep(0.4)

    if not request_id:
        with lock:
            waiting = any(e.get("type") == "session.waiting" for e in events)
        print(f"[FAIL] no input.requested (waiting={waiting}, events={len(events)})")
        return False

    follow = http_json(
        "POST",
        f"/eve/v1/session/{session_id}",
        {"inputResponses": [{"requestId": request_id, "text": "999888"}]},
    )
    print(f"respond status: {follow}")
    if not follow.get("ok"):
        print("[FAIL] inputResponses rejected")
        return False

    stream_done.wait(timeout=120)

    with lock:
        final = final_assistant_text(events)
        failed = any(e.get("type") == "turn.failed" for e in events)
        completed = any(e.get("type") == "turn.completed" for e in events)

    ok = not failed and completed
    print(f"turn.completed: {completed}")
    print(f"final after HITL: {final[:200]!r}")
    print(f"[{'PASS' if ok else 'FAIL'}] HITL ask_question pause and resume")
    return ok


def main() -> int:
    results = []
    try:
        results.append(("health", test_health()))
        results.append(("preview", test_browser_preview()))
        results.append(("interact", test_browser_interact()))
        results.append(("browser", test_browser_agent_task()))
        results.append(("hitl", test_hitl_ask_question()))
    except urllib.error.URLError as e:
        print(f"[FAIL] Could not reach {BASE}: {e}")
        return 1

    print("\n=== Summary ===")
    for name, ok in results:
        print(f"  {'PASS' if ok else 'FAIL'}  {name}")

    all_ok = all(ok for _, ok in results)
    print(f"\n{'ALL TESTS PASSED' if all_ok else 'SOME TESTS FAILED'}")
    return 0 if all_ok else 1


if __name__ == "__main__":
    sys.exit(main())

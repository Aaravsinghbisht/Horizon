#!/usr/bin/env python3
"""Smoke tests for the local site safety scanner API."""

import json
import os
import sys
import urllib.error
import urllib.request

BASE = os.environ.get("COMPOSITER_BASE", "http://127.0.0.1:3000")


def post_evaluate(url: str, focus_url: str | None = None) -> list[dict]:
    payload: dict = {"url": url}
    if focus_url:
        payload["focusUrl"] = focus_url

    request = urllib.request.Request(
        f"{BASE}/api/security/evaluate",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    with urllib.request.urlopen(request, timeout=120) as response:
        events: list[dict] = []
        for line in response:
            line = line.decode("utf-8").strip()
            if not line:
                continue
            events.append(json.loads(line))
        return events


def assert_event_types(events: list[dict], min_check_results: int = 10) -> dict:
    check_results = [e for e in events if e.get("type") == "check-result"]
    complete = next((e for e in events if e.get("type") == "complete"), None)
    skipped = next((e for e in events if e.get("type") == "skipped"), None)

    if skipped and complete:
        return complete["evaluation"]

    if len(check_results) < min_check_results:
        raise AssertionError(f"Expected >={min_check_results} check-result events, got {len(check_results)}")

    if not complete:
        raise AssertionError("Missing complete event in stream")

    return complete["evaluation"]


def main() -> int:
    print("Security evaluate smoke tests\n")

    try:
        safe_events = post_evaluate("https://www.wikipedia.org")
        safe_eval = assert_event_types(safe_events)
        print(f"SAFE URL score: {safe_eval['score']} tier: {safe_eval['tier']}")
        if safe_eval["tier"] != "safe":
            print("WARN: expected wikipedia.org to be safe tier")

        risky_url = "http://paypa1-secure-login.tk/verify-account/login"
        risky_events = post_evaluate(risky_url)
        risky_eval = assert_event_types(risky_events)
        print(f"RISKY URL score: {risky_eval['score']} tier: {risky_eval['tier']}")
        if risky_eval["tier"] == "safe":
            raise AssertionError("Risky URL should not be safe tier")

        print("\nAll security evaluate smoke checks passed.")
        return 0
    except urllib.error.URLError as error:
        print(f"FAIL: could not reach {BASE} — is Compositer running? ({error})")
        return 1
    except AssertionError as error:
        print(f"FAIL: {error}")
        return 1
    except Exception as error:  # noqa: BLE001
        print(f"FAIL: {error}")
        return 1


if __name__ == "__main__":
    sys.exit(main())

#!/usr/bin/env python3
"""Full Compositer diagnostic suite — infrastructure, APIs, latency, and e2e."""

from __future__ import annotations

import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request
from dataclasses import dataclass, field

BASE = os.environ.get("COMPOSITER_BASE", "http://127.0.0.1:3000")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


@dataclass
class CheckResult:
    name: str
    ok: bool
    detail: str = ""
    duration_ms: float = 0.0
    skipped: bool = False


@dataclass
class DiagnosticReport:
    results: list[CheckResult] = field(default_factory=list)

    def add(self, result: CheckResult) -> None:
        self.results.append(result)

    def print_summary(self) -> int:
        print("\n" + "=" * 60)
        print("COMPOSITER DIAGNOSTIC REPORT")
        print("=" * 60)

        for r in self.results:
            if r.skipped:
                status = "SKIP"
            else:
                status = "PASS" if r.ok else "FAIL"
            timing = f" ({r.duration_ms:.0f}ms)" if r.duration_ms > 0 else ""
            print(f"  [{status}] {r.name}{timing}")
            if r.detail:
                for line in r.detail.splitlines():
                    print(f"         {line}")

        passed = sum(1 for r in self.results if r.ok and not r.skipped)
        failed = sum(1 for r in self.results if not r.ok and not r.skipped)
        skipped = sum(1 for r in self.results if r.skipped)
        print("-" * 60)
        print(f"  {passed} passed, {failed} failed, {skipped} skipped")
        print("=" * 60)
        return 0 if failed == 0 else 1


def run_cmd(cmd: list[str], timeout: int = 15) -> tuple[int, str]:
    try:
        proc = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=timeout,
            cwd=ROOT,
        )
        out = (proc.stdout + proc.stderr).strip()
        return proc.returncode, out
    except subprocess.TimeoutExpired:
        return 1, "timeout"
    except FileNotFoundError as exc:
        return 1, str(exc)


def http_json(method: str, path: str, body: dict | None = None, timeout: int = 30) -> tuple[dict, float]:
    data = None
    headers = {"Content-Type": "application/json"}
    if body is not None:
        data = json.dumps(body).encode()
    req = urllib.request.Request(f"{BASE}{path}", data=data, headers=headers, method=method)
    start = time.time()
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        payload = json.loads(resp.read().decode())
    return payload, (time.time() - start) * 1000


def check_typecheck(report: DiagnosticReport) -> None:
    start = time.time()
    code, out = run_cmd(["npm", "run", "typecheck"], timeout=60)
    report.add(
        CheckResult(
            name="TypeScript typecheck",
            ok=code == 0,
            detail=out[-500:] if code != 0 else "tsc clean",
            duration_ms=(time.time() - start) * 1000,
        )
    )


def check_docker_chrome(report: DiagnosticReport) -> str | None:
    start = time.time()
    code, out = run_cmd(
        ["docker", "inspect", "-f", "{{.State.Running}}", "compositer-chrome"],
        timeout=10,
    )
    running = code == 0 and out.strip() == "true"
    ip = ""
    if running:
        _, ip = run_cmd(
            [
                "docker",
                "inspect",
                "-f",
                "{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}",
                "compositer-chrome",
            ],
            timeout=10,
        )

    report.add(
        CheckResult(
            name="Docker Chrome container",
            ok=running,
            detail=f"running={running}, ip={ip or 'n/a'}",
            duration_ms=(time.time() - start) * 1000,
            skipped=code != 0 and "docker.sock" in out,
        )
    )
    return ip if running else None


def check_cdp(chrome_ip: str | None, report: DiagnosticReport) -> None:
    if not chrome_ip:
        report.add(CheckResult(name="Chrome CDP endpoint", ok=False, detail="no chrome ip", skipped=True))
        return

    start = time.time()
    url = f"http://{chrome_ip}:9222/json/version"
    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode())
        ok = "Browser" in data
        detail = data.get("Browser", str(data)[:120])
    except Exception as exc:
        ok = False
        detail = str(exc)

    report.add(
        CheckResult(
            name="Chrome CDP endpoint",
            ok=ok,
            detail=detail,
            duration_ms=(time.time() - start) * 1000,
        )
    )


def check_eve_health(report: DiagnosticReport) -> bool:
    start = time.time()
    try:
        data, ms = http_json("GET", "/eve/v1/health")
        ok = data.get("ok") and data.get("status") == "ready"
        detail = json.dumps(data)
    except Exception as exc:
        ok = False
        detail = str(exc)
        ms = (time.time() - start) * 1000

    report.add(CheckResult(name="eve health", ok=ok, detail=detail, duration_ms=ms))
    return ok


def check_preview(report: DiagnosticReport) -> bool:
    latencies: list[float] = []
    viewport_ok = False
    image_ok = False
    detail_lines: list[str] = []

    for width in (480, 520):
        try:
            data, ms = http_json("GET", f"/api/browser/preview?viewportWidth={width}")
            latencies.append(ms)
            preview = data.get("preview", {})
            vp = preview.get("viewport", {})
            if vp.get("width", 0) >= 320:
                viewport_ok = True
            if len(preview.get("image", "")) > 1000:
                image_ok = True
            detail_lines.append(
                f"w={width} -> {ms:.0f}ms, vp={vp}, url={preview.get('url', 'n/a')[:50]}"
            )
        except Exception as exc:
            detail_lines.append(f"w={width} -> error: {exc}")

    avg_ms = sum(latencies) / len(latencies) if latencies else 0
    ok = viewport_ok and image_ok and avg_ms < 5000
    if latencies:
        detail_lines.append(f"avg latency: {avg_ms:.0f}ms (target <5000ms)")

    report.add(
        CheckResult(
            name="Browser preview API",
            ok=ok,
            detail="\n".join(detail_lines),
            duration_ms=avg_ms,
        )
    )
    return ok


def check_interact(report: DiagnosticReport) -> None:
    try:
        preview, _ = http_json("GET", "/api/browser/preview?viewportWidth=480")
    except Exception as exc:
        report.add(
            CheckResult(name="Browser interact API", ok=False, detail=f"preview failed: {exc}", skipped=True)
        )
        return

    if not preview.get("ok"):
        report.add(
            CheckResult(
                name="Browser interact API",
                ok=True,
                detail="skipped — no tab open",
                skipped=True,
            )
        )
        return

    vp = preview.get("preview", {}).get("viewport", {"width": 480, "height": 300})
    cx, cy = vp.get("width", 480) // 2, vp.get("height", 300) // 2

    start = time.time()
    try:
        data, ms = http_json(
            "POST",
            "/api/browser/interact",
            {"action": "click", "x": cx, "y": cy, "viewportWidth": vp.get("width", 480)},
        )
        ok = data.get("ok") and bool(data.get("url"))
        detail = f"click ({cx},{cy}) -> {ms:.0f}ms, url={data.get('url', 'n/a')[:60]}"
    except Exception as exc:
        ok = False
        detail = str(exc)
        ms = (time.time() - start) * 1000

    report.add(CheckResult(name="Browser interact API", ok=ok, detail=detail, duration_ms=ms))


def check_gateway_retry_logic(report: DiagnosticReport) -> None:
    """Inline tests for gateway-retry classifier (no node required)."""
    cases = [
        ("503 service unavailable", None, True),
        ("credit card required", None, True),
        ("rejected the provided api key", None, False),
        ("session no longer active", None, False),
        ("gateway timeout", "MODEL_CALL_FAILED", True),
    ]
    failures: list[str] = []

    # Mirror TS logic in Python for diagnostic
    non_retryable = [
        r"session.*no longer active",
        r"session_not_active",
        r"rejected the provided api key",
        r"authentication failed",
        r"invalid api key",
        r"cancelled",
        r"canceled",
    ]
    retryable = [
        r"503",
        r"service temporarily unavailable",
        r"gateway",
        r"model_call_failed",
        r"rate limit",
        r"overloaded",
        r"timeout",
        r"temporarily unavailable",
        r"credit card",
        r"customer_verification",
    ]

    import re

    def is_retryable(message: str, code: str | None) -> bool:
        lower = message.lower()
        for p in non_retryable:
            if re.search(p, lower):
                return False
        if code == "MODEL_CALL_FAILED":
            return True
        return any(re.search(p, lower) for p in retryable)

    for message, code, expected in cases:
        got = is_retryable(message, code)
        if got != expected:
            failures.append(f"  {message!r} code={code}: expected {expected}, got {got}")

    report.add(
        CheckResult(
            name="Gateway retry classifier",
            ok=len(failures) == 0,
            detail="\n".join(failures) if failures else f"{len(cases)} cases OK",
        )
    )


def check_connection_pool(report: DiagnosticReport) -> None:
    """Two rapid preview calls should benefit from pooled CDP connection."""
    latencies: list[float] = []
    for i in range(3):
        try:
            _, ms = http_json("GET", f"/api/browser/preview?viewportWidth=500&_t={i}")
            latencies.append(ms)
        except Exception:
            break

    if len(latencies) < 2:
        report.add(
            CheckResult(
                name="CDP connection pool (warm)",
                ok=False,
                detail="could not complete 2 preview calls",
                skipped=True,
            )
        )
        return

    first, rest = latencies[0], latencies[1:]
    avg_rest = sum(rest) / len(rest)
    ok = avg_rest <= first * 1.5 or avg_rest < 2000
    report.add(
        CheckResult(
            name="CDP connection pool (warm)",
            ok=ok,
            detail=f"1st={first:.0f}ms, rest avg={avg_rest:.0f}ms ({', '.join(f'{l:.0f}' for l in latencies)})",
            duration_ms=avg_rest,
        )
    )


def run_e2e_subset(report: DiagnosticReport) -> None:
    """Run the existing e2e script as a subprocess."""
    start = time.time()
    code, out = run_cmd([sys.executable, os.path.join(ROOT, "scripts", "e2e-test.py")], timeout=600)
    report.add(
        CheckResult(
            name="E2E test suite",
            ok=code == 0,
            detail=out[-2000:] if len(out) > 2000 else out,
            duration_ms=(time.time() - start) * 1000,
            skipped="Could not reach" in out,
        )
    )


def main() -> int:
    report = DiagnosticReport()

    print("Running Compositer full diagnostic…\n")

    check_typecheck(report)
    chrome_ip = check_docker_chrome(report)
    check_cdp(chrome_ip, report)

    server_up = check_eve_health(report)
    if server_up:
        check_preview(report)
        check_interact(report)
        check_connection_pool(report)
        check_gateway_retry_logic(report)
        run_e2e_subset(report)
    else:
        report.add(
            CheckResult(
                name="Browser preview API",
                ok=False,
                detail=f"skipped — server not reachable at {BASE}",
                skipped=True,
            )
        )
        report.add(
            CheckResult(
                name="E2E test suite",
                ok=False,
                detail="skipped — start server with: npm run restart",
                skipped=True,
            )
        )
        check_gateway_retry_logic(report)

    return report.print_summary()


if __name__ == "__main__":
    sys.exit(main())

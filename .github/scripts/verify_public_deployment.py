#!/usr/bin/env python3
"""Wait until the public site serves the deployment marker for a commit."""

from __future__ import annotations

import argparse
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from collections.abc import Callable


DEFAULT_ATTEMPTS = 30
DEFAULT_INTERVAL_SECONDS = 10.0
DEFAULT_TIMEOUT_SECONDS = 15.0
USER_AGENT = "Mozilla/5.0 (compatible; kflab-deployment-verifier/1.0; +https://github.com)"


def build_marker_url(base_url: str, marker_path: str, expected_sha: str, attempt: int) -> str:
    marker_url = f"{base_url.rstrip('/')}/{marker_path.lstrip('/')}"
    query = urllib.parse.urlencode({"sha": expected_sha, "attempt": attempt})
    return f"{marker_url}?{query}"


def fetch_marker(url: str, timeout: float) -> str:
    request = urllib.request.Request(
        url,
        headers={
            "Cache-Control": "no-cache",
            "Pragma": "no-cache",
            "User-Agent": USER_AGENT,
        },
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return response.read().decode("utf-8").strip()


def wait_for_deployment(
    *,
    base_url: str,
    marker_path: str,
    expected_sha: str,
    attempts: int = DEFAULT_ATTEMPTS,
    interval_seconds: float = DEFAULT_INTERVAL_SECONDS,
    timeout_seconds: float = DEFAULT_TIMEOUT_SECONDS,
    fetcher: Callable[[str, float], str] = fetch_marker,
    sleeper: Callable[[float], None] = time.sleep,
) -> None:
    last_detail = "no attempts made"
    for attempt in range(1, attempts + 1):
        url = build_marker_url(base_url, marker_path, expected_sha, attempt)
        try:
            actual_sha = fetcher(url, timeout_seconds)
            if actual_sha == expected_sha:
                print(f"Public deployment verified on attempt {attempt}: {expected_sha}")
                return
            last_detail = f"served {actual_sha or 'an empty marker'}"
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError) as error:
            last_detail = str(error)

        print(f"Deployment not current on attempt {attempt}/{attempts}: {last_detail}", flush=True)
        if attempt < attempts:
            sleeper(interval_seconds)

    raise RuntimeError(f"Public deployment did not serve {expected_sha}: {last_detail}")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", required=True)
    parser.add_argument("--expected-sha", required=True)
    parser.add_argument("--marker-path", default="deployment-version.txt")
    parser.add_argument("--attempts", type=int, default=DEFAULT_ATTEMPTS)
    parser.add_argument("--interval-seconds", type=float, default=DEFAULT_INTERVAL_SECONDS)
    parser.add_argument("--timeout-seconds", type=float, default=DEFAULT_TIMEOUT_SECONDS)
    args = parser.parse_args()

    if not re.fullmatch(r"[0-9a-fA-F]{40}", args.expected_sha):
        parser.error("--expected-sha must be a 40-character hexadecimal commit SHA")
    if args.attempts < 1:
        parser.error("--attempts must be at least 1")
    if args.interval_seconds < 0 or args.timeout_seconds <= 0:
        parser.error("interval must be non-negative and timeout must be positive")

    try:
        wait_for_deployment(
            base_url=args.base_url,
            marker_path=args.marker_path,
            expected_sha=args.expected_sha.lower(),
            attempts=args.attempts,
            interval_seconds=args.interval_seconds,
            timeout_seconds=args.timeout_seconds,
        )
    except RuntimeError as error:
        print(error, file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

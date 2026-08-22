#!/usr/bin/env python3
"""Fetch the repository metadata rendered on the resources pages."""

from __future__ import annotations

import argparse
import concurrent.futures
import datetime as dt
import json
import os
import pathlib
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from collections.abc import Callable
from typing import Any


REPOSITORY_LINE = re.compile(r"^\s*-\s+([A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+)\s*(?:#.*)?$")
GITHUB_API_VERSION = "2022-11-28"
MAX_WORKERS = 4


def utc_now() -> dt.datetime:
    return dt.datetime.now(dt.timezone.utc)


def isoformat_utc(value: dt.datetime) -> str:
    return value.astimezone(dt.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def parse_repositories(path: pathlib.Path) -> list[str]:
    repositories: list[str] = []
    in_github_repos = False

    for line in path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not in_github_repos:
            in_github_repos = stripped == "github_repos:"
            continue

        if stripped and not stripped.startswith("#") and not line[:1].isspace():
            break

        match = REPOSITORY_LINE.match(line)
        if match:
            repositories.append(match.group(1))

    if not repositories:
        raise ValueError(f"No github_repos entries found in {path}")
    return repositories


def load_previous_stats(path: pathlib.Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    payload = json.loads(path.read_text(encoding="utf-8"))
    return payload if isinstance(payload, dict) else {}


def count_value(payload: dict[str, Any], key: str) -> int:
    value = payload.get(key)
    return value if isinstance(value, int) and not isinstance(value, bool) else 0


def normalize_repository(payload: dict[str, Any], fetched_at: str) -> dict[str, Any]:
    description = payload.get("description")
    pushed_at = payload.get("pushed_at")
    return {
        "description": description if isinstance(description, str) else "",
        "forks_count": count_value(payload, "forks_count"),
        "open_issues_count": count_value(payload, "open_issues_count"),
        "pushed_at": pushed_at if isinstance(pushed_at, str) else "",
        "stargazers_count": count_value(payload, "stargazers_count"),
        "fetched_at": fetched_at,
    }


def fetch_repository(
    repository: str,
    token: str = "",
    *,
    opener: Callable[..., Any] = urllib.request.urlopen,
    sleep: Callable[[float], None] = time.sleep,
) -> dict[str, Any]:
    owner, name = repository.split("/", 1)
    url = f"https://api.github.com/repos/{urllib.parse.quote(owner)}/{urllib.parse.quote(name)}"
    headers = {
        "Accept": "application/vnd.github+json",
        "User-Agent": "kenji-fukushima-lab-site-build",
        "X-GitHub-Api-Version": GITHUB_API_VERSION,
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"

    error: Exception | None = None
    for attempt in range(3):
        request = urllib.request.Request(url, headers=headers)
        try:
            response = opener(request, timeout=20)
            try:
                payload = json.load(response)
            finally:
                response.close()
            if not isinstance(payload, dict):
                raise ValueError(f"GitHub returned a non-object payload for {repository}")
            return payload
        except (OSError, ValueError, json.JSONDecodeError, urllib.error.HTTPError, urllib.error.URLError) as caught:
            error = caught
            if attempt < 2:
                sleep(2**attempt)

    raise RuntimeError(f"Could not fetch {repository}: {error}")


def refresh_repository_stats(
    repositories_path: pathlib.Path,
    output_path: pathlib.Path,
    token: str = "",
    *,
    fetcher: Callable[[str, str], dict[str, Any]] = fetch_repository,
    now: dt.datetime | None = None,
) -> tuple[dict[str, Any], list[str]]:
    repositories = parse_repositories(repositories_path)
    previous = load_previous_stats(output_path)
    previous_repositories = previous.get("repositories")
    if not isinstance(previous_repositories, dict):
        previous_repositories = {}

    fetched_at = isoformat_utc(now or utc_now())
    refreshed: dict[str, dict[str, Any]] = {}
    failures: list[str] = []

    with concurrent.futures.ThreadPoolExecutor(max_workers=min(MAX_WORKERS, len(repositories))) as executor:
        futures = {executor.submit(fetcher, repository, token): repository for repository in repositories}
        for future in concurrent.futures.as_completed(futures):
            repository = futures[future]
            try:
                refreshed[repository] = normalize_repository(future.result(), fetched_at)
            except Exception as error:  # Keep the last generated value when GitHub is temporarily unavailable.
                previous_data = previous_repositories.get(repository)
                if isinstance(previous_data, dict):
                    refreshed[repository] = previous_data
                    failures.append(f"{repository}: {error}")
                else:
                    raise RuntimeError(f"No repository stats are available for {repository}: {error}") from error

    output = {
        "generated_at": fetched_at,
        "repositories": {repository: refreshed[repository] for repository in sorted(refreshed)},
    }
    output_path.parent.mkdir(parents=True, exist_ok=True)
    temporary_path = output_path.with_suffix(f"{output_path.suffix}.tmp")
    temporary_path.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temporary_path.replace(output_path)
    return output, failures


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repositories", type=pathlib.Path, default=pathlib.Path("_data/repositories.yml"))
    parser.add_argument("--output", type=pathlib.Path, default=pathlib.Path("_data/repo_stats.json"))
    args = parser.parse_args()

    try:
        output, failures = refresh_repository_stats(
            args.repositories,
            args.output,
            token=os.environ.get("GITHUB_TOKEN", ""),
        )
    except (OSError, ValueError, json.JSONDecodeError, RuntimeError) as error:
        print(error, file=sys.stderr)
        return 1

    for failure in failures:
        print(f"Using previous repository stats for {failure}", file=sys.stderr)
    print(f"Wrote {len(output['repositories'])} repositories to {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

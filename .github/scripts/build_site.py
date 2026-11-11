#!/usr/bin/env python3
"""Build locally with authenticated, cached GitHub repository statistics."""

from __future__ import annotations

import argparse
import datetime as dt
import fcntl
import json
import os
import pathlib
import shutil
import subprocess
import sys
import tempfile

from fetch_repo_stats import load_previous_stats, parse_repositories, refresh_repository_stats, utc_now


ROOT = pathlib.Path(__file__).resolve().parents[2]
CACHE_TTL = dt.timedelta(hours=24)


def fresh_stats(path: pathlib.Path, repositories: list[str]) -> bool:
    try:
        data = load_previous_stats(path).get("repositories", {})
        if set(data) != set(repositories):
            return False
        now = utc_now()
        return all(
            dt.timedelta(0) <= now - dt.datetime.fromisoformat(data[repo]["fetched_at"].replace("Z", "+00:00")) < CACHE_TTL
            for repo in repositories
        )
    except (OSError, ValueError, TypeError, KeyError, AttributeError):
        return False


def github_token() -> str:
    token = os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN")
    if token:
        return token
    try:
        result = subprocess.run(
            ["gh", "auth", "token", "--hostname", "github.com"],
            check=True,
            capture_output=True,
            text=True,
        )
        if result.stdout.strip():
            return result.stdout.strip()
    except (OSError, subprocess.CalledProcessError):
        pass
    raise RuntimeError("Authenticate with gh auth login or set GITHUB_TOKEN/GH_TOKEN to refresh local repository statistics.")


def prepare_repo_stats(root: pathlib.Path = ROOT) -> pathlib.Path:
    cache = root / ".jekyll-cache" / "local-repo-stats.json"
    cache.parent.mkdir(parents=True, exist_ok=True)
    repositories_path = root / "_data" / "repositories.yml"
    repositories = parse_repositories(repositories_path)

    # Serialize local refreshes so simultaneous builds share one API request set.
    with cache.with_suffix(".lock").open("a") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        for candidate in (cache, root / "_data" / "repo_stats.json"):
            if fresh_stats(candidate, repositories):
                print(f"Using fresh repository statistics from {candidate.relative_to(root)}", flush=True)
                return candidate

        with tempfile.TemporaryDirectory(prefix="repo-stats-", dir=cache.parent) as directory:
            snapshot = pathlib.Path(directory) / cache.name
            _, failures = refresh_repository_stats(repositories_path, snapshot, token=github_token())
            if failures:
                raise RuntimeError("Could not refresh local repository statistics: " + "; ".join(failures))
            snapshot.replace(cache)
        print(f"Refreshed {len(repositories)} repositories in {cache.relative_to(root)}", flush=True)
        return cache


def build(destination: pathlib.Path) -> None:
    statistics = prepare_repo_stats()
    # Jekyll reads an isolated copy of the small data directory. Tracked data
    # stays under CI ownership, including when the build fails.
    with tempfile.TemporaryDirectory(prefix="local-build-", dir=ROOT / ".jekyll-cache") as directory:
        temporary = pathlib.Path(directory)
        shutil.copytree(ROOT / "_data", temporary / "data")
        shutil.copyfile(statistics, temporary / "data" / "repo_stats.json")
        configuration = temporary / "config.yml"
        configuration.write_text(json.dumps({"data_dir": str((temporary / "data").relative_to(ROOT))}), encoding="utf-8")
        subprocess.run(
            ["bundle", "exec", "jekyll", "build", "--config", f"_config.yml,{configuration}", "--destination", str(destination)],
            cwd=ROOT,
            env={**os.environ, "JEKYLL_ENV": "production"},
            check=True,
        )
    subprocess.run(["npm", "run", "css:purge", "--", str(destination)], cwd=ROOT, check=True)
    subprocess.run([sys.executable, ".github/scripts/validate_site_artifact.py", str(destination)], cwd=ROOT, check=True)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--destination", type=pathlib.Path, default=ROOT / "_site")
    parser.add_argument("--prepare-only", action="store_true", help="Prepare the local statistics cache, for example before a Compose build.")
    args = parser.parse_args()
    try:
        if args.prepare_only:
            prepare_repo_stats()
        else:
            build(args.destination.resolve())
    except (OSError, ValueError, RuntimeError, subprocess.CalledProcessError) as error:
        print(error, file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

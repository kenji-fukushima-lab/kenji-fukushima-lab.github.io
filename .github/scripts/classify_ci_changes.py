#!/usr/bin/env python3
"""Select build/test coverage from the shared site manifest and page permalinks."""

from __future__ import annotations

import argparse
from fnmatch import fnmatchcase
import json
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[2]
MANIFEST = json.loads((ROOT / ".github/ci-paths.json").read_text())
ALL_LIGHTHOUSE_URLS = tuple(MANIFEST["lighthouse_paths"])
SITE_PREFIXES = tuple(MANIFEST["site_prefixes"])
SITE_FILES = set(MANIFEST["site_files"])
LANGUAGES = MANIFEST["languages"]


def _is_root_public_path(path: str) -> bool:
    return "/" not in path and any(fnmatchcase(path, pattern) for pattern in MANIFEST["root_public_patterns"])


def _is_site_path(path: str) -> bool:
    return path in SITE_FILES or path.startswith(SITE_PREFIXES) or _is_root_public_path(path)


def _page_permalink(path: str, root: Path) -> str | None:
    source = root / path
    if not source.is_file() or not source.resolve().is_relative_to(root.resolve()):
        return None
    content = source.read_text(encoding="utf-8")
    front_matter = re.match(r"\A---\s*\n(.*?)\n---(?:\s|$)", content, re.S)
    if not front_matter:
        return None
    match = re.search(r"^permalink:\s*([^\n]+)", front_matter[1], re.M)
    if match:
        permalink = match[1].strip().strip("\"'")
        if permalink.startswith("/") and not any(char in permalink for char in (" ", ",", "?", "#")):
            return permalink
    if path.startswith("_projects/"):
        return f"/research/{source.stem}/"
    return None


def _localized(lang: str, path: str) -> str:
    prefix = LANGUAGES[lang]
    return path if prefix and (path == prefix or path.startswith(prefix + "/")) else prefix + path


def _lighthouse_urls(paths: list[str], root: Path) -> tuple[str, ...]:
    site_paths = [path for path in paths if _is_site_path(path)]
    if any(path in SITE_FILES or path.startswith(tuple(MANIFEST["global_prefixes"])) for path in site_paths):
        return ALL_LIGHTHOUSE_URLS

    urls: set[str] = set()
    for path in site_paths:
        if _is_root_public_path(path):
            # XML, robots.txt and ownership files are checked by the build;
            # they are not visitor pages to score with Lighthouse.
            continue
        if path.startswith(("_bibliography/", "_profiles/", "_news/")):
            for lang in LANGUAGES:
                urls.add(_localized(lang, "/"))
                if path.startswith("_bibliography/"):
                    urls.update(_localized(lang, page) for page in ("/publications/", "/resources/", "/research/3_project/"))
                elif path.startswith("_profiles/"):
                    urls.add(_localized(lang, "/people/"))
            continue
        parts = Path(path).parts
        if len(parts) < 3 or parts[1] not in LANGUAGES:
            return ALL_LIGHTHOUSE_URLS
        lang = parts[1]
        if path.startswith(("_posts/", "_scheduled/")):
            urls.add(_localized(lang, "/blog/"))
        elif path.startswith(("_pages/", "_projects/")):
            permalink = _page_permalink(path, root)
            if permalink is None:
                return ALL_LIGHTHOUSE_URLS
            if permalink != "/404.html" and not permalink.endswith((".xml", ".txt")):
                urls.add(_localized(lang, permalink))
            if path.startswith("_projects/"):
                urls.add(_localized(lang, "/research/"))
        else:
            return ALL_LIGHTHOUSE_URLS
    return tuple(url for url in ALL_LIGHTHOUSE_URLS if url in urls) + tuple(sorted(urls - set(ALL_LIGHTHOUSE_URLS)))


def classify(paths: list[str], event: str, *, full: bool = False, root: Path = ROOT) -> dict[str, str]:
    normalized = sorted({path.strip().removeprefix("./") for path in paths if path.strip()})
    scheduled = event == "schedule"
    full = full or event == "workflow_dispatch"
    site_changed = scheduled or full or any(_is_site_path(path) for path in normalized)
    ui_changed = any(path == "playwright.config.js" or path.startswith("tests/ui/") for path in normalized)
    urls = ALL_LIGHTHOUSE_URLS if full else (() if scheduled else _lighthouse_urls(normalized, root))
    return {
        "checks_required": str(scheduled or full or any(path not in {"AGENTS.md", "VERSION"} for path in normalized)).lower(),
        "site_changed": str(site_changed).lower(),
        "build_required": str(site_changed or ui_changed).lower(),
        "browser_required": str(full or ui_changed or bool(urls)).lower(),
        "lighthouse_required": str(bool(urls)).lower(),
        "lighthouse_urls": ",".join(urls),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--event", required=True)
    parser.add_argument("--full", action="store_true", help="Run the full browser/Lighthouse set, including on a scheduled build")
    args = parser.parse_args()
    for key, value in classify(sys.stdin.readlines(), args.event, full=args.full).items():
        print(f"{key}={value}")


if __name__ == "__main__":
    main()

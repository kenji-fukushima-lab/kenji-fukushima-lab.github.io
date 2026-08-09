#!/usr/bin/env python3
"""Classify changed paths so CI only runs the expensive jobs it needs."""

from __future__ import annotations

import argparse
import sys

ALL_LIGHTHOUSE_URLS = (
    "/",
    "/publications/",
    "/resources/",
    "/ja/blog/",
    "/ja/research/3_project/",
)

SITE_PREFIXES = (
    "assets/",
    "_sass/",
    "_includes/",
    "_layouts/",
    "_plugins/",
    "_pages/",
    "_projects/",
    "_profiles/",
    "_posts/",
    "_news/",
    "_data/",
    "_bibliography/",
)

SITE_FILES = {
    "_config.yml",
    "Dockerfile",
    "Gemfile",
    "Gemfile.lock",
    "package.json",
    "package-lock.json",
    "purgecss.config.js",
    "requirements.txt",
    "requirements-build.txt",
    ".lighthouserc.cjs",
    ".github/scripts/prepare-jekyll-build-env.sh",
    ".github/workflows/deploy.yml",
}

GLOBAL_LIGHTHOUSE_PREFIXES = (
    "assets/",
    "_sass/",
    "_includes/",
    "_layouts/",
    "_plugins/",
    "_data/",
)

GLOBAL_LIGHTHOUSE_FILES = SITE_FILES - {"Dockerfile"}


def _is_site_path(path: str) -> bool:
    return path in SITE_FILES or path.startswith(SITE_PREFIXES)


def _lighthouse_urls(paths: list[str], event: str) -> tuple[str, ...]:
    site_paths = [path for path in paths if _is_site_path(path)]
    if not site_paths:
        return ()
    if event != "pull_request":
        return ALL_LIGHTHOUSE_URLS
    if any(path in GLOBAL_LIGHTHOUSE_FILES or path.startswith(GLOBAL_LIGHTHOUSE_PREFIXES) for path in site_paths):
        return ALL_LIGHTHOUSE_URLS

    urls: set[str] = set()
    for path in site_paths:
        if path.startswith("_bibliography/"):
            urls.update(("/publications/", "/resources/", "/ja/research/3_project/"))
        elif path.startswith(("_news/", "_profiles/")):
            urls.add("/")
        elif path.startswith("_posts/ja/"):
            urls.add("/ja/blog/")
        elif path.startswith("_posts/"):
            return ALL_LIGHTHOUSE_URLS
        elif path.startswith("_pages/"):
            filename = path.rsplit("/", 1)[-1]
            if filename == "publications.md":
                urls.add("/publications/")
            elif filename == "resources.md":
                urls.add("/resources/")
            elif filename == "blog.md":
                urls.add("/ja/blog/")
            else:
                urls.add("/")
        elif path == "_projects/ja/3_project.md":
            urls.add("/ja/research/3_project/")
        elif path.startswith("_projects/"):
            urls.add("/")
        else:
            return ALL_LIGHTHOUSE_URLS

    return tuple(url for url in ALL_LIGHTHOUSE_URLS if url in urls) or ALL_LIGHTHOUSE_URLS


def classify(paths: list[str], event: str) -> dict[str, str]:
    normalized = sorted({path.strip().removeprefix("./") for path in paths if path.strip()})
    site_changed = any(_is_site_path(path) for path in normalized)
    ui_tests_changed = any(path == "playwright.config.js" or path.startswith("tests/ui/") for path in normalized)
    source_links_changed = any(path.endswith((".md", ".html")) for path in normalized)
    urls = _lighthouse_urls(normalized, event)

    return {
        "site_changed": str(site_changed).lower(),
        "build_required": str(site_changed or ui_tests_changed).lower(),
        "browser_required": str(site_changed or ui_tests_changed).lower(),
        "lighthouse_required": str(site_changed).lower(),
        "source_links_changed": str(source_links_changed).lower(),
        "lighthouse_urls": ",".join(urls),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--event", required=True)
    args = parser.parse_args()
    result = classify(sys.stdin.readlines(), args.event)
    for key, value in result.items():
        print(f"{key}={value}")


if __name__ == "__main__":
    main()

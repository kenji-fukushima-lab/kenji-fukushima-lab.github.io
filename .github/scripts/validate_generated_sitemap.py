#!/usr/bin/env python3
"""Validate that every generated sitemap URL resolves to a built file."""

from __future__ import annotations

import argparse
import sys
import urllib.parse
import xml.etree.ElementTree as ET
from pathlib import Path


SITEMAP_NAMESPACE = {"sitemap": "http://www.sitemaps.org/schemas/sitemap/0.9"}


def output_path_for_url(site_dir: Path, url: str, expected_origin: str) -> Path:
    parsed = urllib.parse.urlsplit(url)
    origin = f"{parsed.scheme}://{parsed.netloc}"
    if origin != expected_origin:
        raise ValueError(f"unexpected origin {origin!r}")
    if parsed.query or parsed.fragment:
        raise ValueError("sitemap URLs must not contain a query or fragment")

    relative = urllib.parse.unquote(parsed.path).lstrip("/")
    if not relative or parsed.path.endswith("/"):
        relative = f"{relative}index.html"
    return site_dir / relative


def validate_sitemap(sitemap_path: Path, site_dir: Path, expected_origin: str) -> list[str]:
    try:
        root = ET.parse(sitemap_path).getroot()
    except (ET.ParseError, OSError) as error:
        return [f"{sitemap_path}: cannot read sitemap: {error}"]

    errors: list[str] = []
    seen: set[str] = set()
    locations = root.findall("sitemap:url/sitemap:loc", SITEMAP_NAMESPACE)
    if not locations:
        return [f"{sitemap_path}: no sitemap URLs found"]

    for location in locations:
        url = (location.text or "").strip()
        if not url:
            errors.append(f"{sitemap_path}: empty <loc>")
            continue
        if url in seen:
            errors.append(f"{sitemap_path}: duplicate URL: {url}")
            continue
        seen.add(url)

        try:
            output_path = output_path_for_url(site_dir, url, expected_origin)
        except ValueError as error:
            errors.append(f"{url}: {error}")
            continue
        if not output_path.is_file():
            errors.append(f"{url}: generated file is missing ({output_path})")

    return errors


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("sitemap", type=Path)
    parser.add_argument("site_dir", type=Path)
    parser.add_argument("--origin", required=True)
    args = parser.parse_args()

    errors = validate_sitemap(args.sitemap, args.site_dir, args.origin.rstrip("/"))
    if errors:
        print("Generated sitemap validation failed:", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1

    print(f"Generated sitemap validation passed: {args.sitemap}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

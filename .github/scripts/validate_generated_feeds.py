#!/usr/bin/env python3
"""Validate generated Atom feeds before deployment."""

from __future__ import annotations

import argparse
import sys
import urllib.parse
import xml.etree.ElementTree as ET
from pathlib import Path


ATOM_NAMESPACE = "http://www.w3.org/2005/Atom"
ATOM = {"atom": ATOM_NAMESPACE}


def validate_feed(path: Path) -> list[str]:
    errors: list[str] = []
    try:
        root = ET.parse(path).getroot()
    except (OSError, ET.ParseError) as error:
        return [f"{path}: invalid XML: {error}"]

    if root.tag != f"{{{ATOM_NAMESPACE}}}feed":
        errors.append(f"{path}: root element is not an Atom feed")
        return errors

    self_links = [
        link.get("href", "")
        for link in root.findall("atom:link", ATOM)
        if link.get("rel") == "self"
    ]
    if len(self_links) != 1:
        errors.append(f"{path}: expected exactly one self link")

    for index, entry in enumerate(root.findall("atom:entry", ATOM), start=1):
        title = " ".join(entry.findtext("atom:title", default="", namespaces=ATOM).split())
        alternate_links = [
            link.get("href", "")
            for link in entry.findall("atom:link", ATOM)
            if link.get("rel", "alternate") == "alternate"
        ]
        if not title:
            errors.append(f"{path}: entry {index} has no title")
        if len(alternate_links) != 1:
            errors.append(f"{path}: entry {index} must have exactly one alternate link")
            continue
        parsed = urllib.parse.urlsplit(alternate_links[0])
        if parsed.scheme != "https" or not parsed.netloc:
            errors.append(f"{path}: entry {index} has an invalid alternate URL")

    return errors


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("feeds", nargs="+", type=Path)
    args = parser.parse_args()

    errors = [error for feed in args.feeds for error in validate_feed(feed)]
    if errors:
        print("\n".join(errors), file=sys.stderr)
        return 1
    print(f"Validated {len(args.feeds)} generated Atom feed(s).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

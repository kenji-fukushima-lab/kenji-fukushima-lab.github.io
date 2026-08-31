#!/usr/bin/env python3
"""Check that local responsive-image width descriptors match generated files."""

import argparse
from html.parser import HTMLParser
from pathlib import Path
import sys
from urllib.parse import unquote, urlsplit

from PIL import Image


class ImageValidator(HTMLParser):
    def __init__(self, root, page, dimensions):
        super().__init__()
        self.root = root.resolve()
        self.page = page.resolve()
        self.dimensions = dimensions
        self.errors = []
        self.checked = 0

    def handle_starttag(self, tag, attrs):
        attributes = dict(attrs)
        for attribute in ("srcset", "imagesrcset"):
            source = attributes.get(attribute) or ""
            if source.startswith("data:"):
                continue
            widths = set()
            for candidate in source.split(","):
                parts = candidate.split()
                if len(parts) != 2 or not parts[1].endswith("w"):
                    continue
                url = urlsplit(parts[0])
                if url.scheme or url.netloc:
                    continue
                try:
                    width = int(parts[1][:-1])
                    if width <= 0 or width in widths:
                        raise ValueError(f"invalid or duplicate width descriptor {parts[1]}")
                    widths.add(width)
                    decoded = unquote(url.path)
                    image = ((self.root / decoded.lstrip("/")) if decoded.startswith("/") else (self.page.parent / decoded)).resolve()
                    if not image.is_relative_to(self.root):
                        raise ValueError("image path escapes the generated site")
                    if image not in self.dimensions:
                        with Image.open(image) as opened:
                            self.dimensions[image] = opened.width
                    actual = self.dimensions[image]
                    if actual != width:
                        raise ValueError(f"declares {width}w but generated width is {actual}px")
                    self.checked += 1
                except (OSError, ValueError) as error:
                    self.errors.append(f"{self.page.relative_to(self.root)}: {parts[0]}: {error}")


def validate_site(root):
    errors, dimensions, checked = [], {}, 0
    for page in sorted(root.rglob("*.html")):
        validator = ImageValidator(root, page, dimensions)
        validator.feed(page.read_text(encoding="utf-8"))
        errors.extend(validator.errors)
        checked += validator.checked
    return errors, checked


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("site", type=Path, nargs="?", default=Path("_site"))
    args = parser.parse_args()
    if not args.site.is_dir():
        parser.error(f"generated site does not exist: {args.site}")
    errors, checked = validate_site(args.site)
    if errors:
        print("\n".join(errors), file=sys.stderr)
        return 1
    print(f"Validated {checked} local responsive-image width descriptors.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

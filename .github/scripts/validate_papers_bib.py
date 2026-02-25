#!/usr/bin/env python3
"""Validate _bibliography/papers.bib.

Checks:
1. DOI format
2. Duplicate keys / duplicate DOI
3. Missing required fields
4. Broken external links
"""

from __future__ import annotations

import argparse
import concurrent.futures
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass, field
from pathlib import Path

DOI_PATTERN = re.compile(r"^10\.\d{4,9}/\S+$", re.IGNORECASE)
URL_PATTERN = re.compile(r"^https?://", re.IGNORECASE)

REQUIRED_BASE_FIELDS = ("article_type", "title", "author", "year")
ENTRY_SPECIFIC_REQUIRED = {
    "article": ("journal",),
    "inproceedings": ("booktitle",),
    "incollection": ("booktitle",),
    "thesis": ("school",),
    "mastersthesis": ("school",),
    "phdthesis": ("school",),
}

URL_FIELDS = (
    "url",
    "preprint",
    "html",
    "pdf",
    "supp",
    "video",
    "blog",
    "code",
    "poster",
    "slides",
    "website",
    "feature_article",
    "press_release",
    "correction",
)

HTTP_TIMEOUT_SECONDS = 12
HTTP_MAX_RETRIES = 2
WORKERS = 8

USER_AGENT = "Mozilla/5.0 (compatible; papers-bib-validator/1.0; +https://github.com)"


@dataclass
class Entry:
    entry_type: str
    key: str
    fields: dict[str, str]


@dataclass
class ValidationResult:
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)

    def extend(self, other: "ValidationResult") -> None:
        self.errors.extend(other.errors)
        self.warnings.extend(other.warnings)

    def has_errors(self) -> bool:
        return len(self.errors) > 0


def normalize_value(raw: str) -> str:
    value = raw.strip().strip(",").strip()
    if value in ("{}", ""):
        return ""
    if value.startswith("{") and value.endswith("}"):
        value = value[1:-1]
    if value.startswith('"') and value.endswith('"'):
        value = value[1:-1]
    return value.strip()


def normalize_doi(raw: str) -> str:
    value = normalize_value(raw).strip()
    if not value:
        return ""
    value = re.sub(r"^https?://(dx\.)?doi\.org/", "", value, flags=re.IGNORECASE)
    return value.strip()


def split_possible_urls(raw: str) -> list[str]:
    cleaned = normalize_value(raw)
    if not cleaned:
        return []
    candidates = [item.strip() for item in cleaned.split(",")]
    return [item for item in candidates if item and URL_PATTERN.match(item)]


def find_matching_brace(text: str, start_index: int) -> int:
    depth = 0
    for index in range(start_index, len(text)):
        char = text[index]
        if char == "{":
            depth += 1
        elif char == "}":
            depth -= 1
            if depth == 0:
                return index
    return -1


def parse_bib_entries(content: str) -> list[Entry]:
    entries: list[Entry] = []
    cursor = 0
    while True:
        at_index = content.find("@", cursor)
        if at_index == -1:
            break
        brace_index = content.find("{", at_index)
        if brace_index == -1:
            break
        entry_type = content[at_index + 1 : brace_index].strip().lower()
        end_index = find_matching_brace(content, brace_index)
        if end_index == -1:
            break
        body = content[brace_index + 1 : end_index].strip()
        cursor = end_index + 1
        if "," not in body:
            continue
        key, fields_blob = body.split(",", 1)
        fields = parse_fields_blob(fields_blob)
        entries.append(Entry(entry_type=entry_type, key=key.strip(), fields=fields))
    return entries


def parse_fields_blob(blob: str) -> dict[str, str]:
    fields: dict[str, str] = {}
    cursor = 0
    length = len(blob)
    while cursor < length:
        while cursor < length and blob[cursor] in " \t\r\n,":
            cursor += 1
        if cursor >= length:
            break

        field_start = cursor
        while cursor < length and (blob[cursor].isalnum() or blob[cursor] in "_-"):
            cursor += 1
        field_name = blob[field_start:cursor].strip().lower()
        if not field_name:
            break

        while cursor < length and blob[cursor] in " \t\r\n":
            cursor += 1
        if cursor >= length or blob[cursor] != "=":
            break
        cursor += 1
        while cursor < length and blob[cursor] in " \t\r\n":
            cursor += 1
        if cursor >= length:
            break

        if blob[cursor] == "{":
            value_start = cursor
            cursor = consume_braced_value(blob, cursor)
            raw_value = blob[value_start:cursor]
        elif blob[cursor] == '"':
            value_start = cursor
            cursor = consume_quoted_value(blob, cursor)
            raw_value = blob[value_start:cursor]
        else:
            value_start = cursor
            while cursor < length and blob[cursor] not in ",\n\r":
                cursor += 1
            raw_value = blob[value_start:cursor]

        fields[field_name] = normalize_value(raw_value)

        while cursor < length and blob[cursor] != ",":
            if blob[cursor] not in " \t\r\n":
                break
            cursor += 1
        if cursor < length and blob[cursor] == ",":
            cursor += 1
    return fields


def consume_braced_value(blob: str, cursor: int) -> int:
    depth = 0
    index = cursor
    while index < len(blob):
        char = blob[index]
        if char == "{":
            depth += 1
        elif char == "}":
            depth -= 1
            if depth == 0:
                return index + 1
        index += 1
    return len(blob)


def consume_quoted_value(blob: str, cursor: int) -> int:
    escaped = False
    index = cursor + 1
    while index < len(blob):
        char = blob[index]
        if escaped:
            escaped = False
        elif char == "\\":
            escaped = True
        elif char == '"':
            return index + 1
        index += 1
    return len(blob)


def validate_required_fields(entries: list[Entry]) -> ValidationResult:
    result = ValidationResult()
    for entry in entries:
        missing: list[str] = []
        for field in REQUIRED_BASE_FIELDS:
            if not normalize_value(entry.fields.get(field, "")):
                missing.append(field)
        for field in ENTRY_SPECIFIC_REQUIRED.get(entry.entry_type, ()):
            if not normalize_value(entry.fields.get(field, "")):
                missing.append(field)
        if missing:
            result.errors.append(f"[{entry.key}] missing required field(s): {', '.join(sorted(set(missing)))}")
    return result


def validate_duplicates(entries: list[Entry]) -> ValidationResult:
    result = ValidationResult()

    seen_keys: dict[str, str] = {}
    for entry in entries:
        normalized_key = entry.key.strip()
        if normalized_key in seen_keys:
            result.errors.append(f"Duplicate key: {normalized_key} (also used by {seen_keys[normalized_key]})")
        else:
            seen_keys[normalized_key] = normalized_key

    seen_doi: dict[str, str] = {}
    for entry in entries:
        doi = normalize_doi(entry.fields.get("doi", ""))
        if not doi:
            continue
        if doi in seen_doi:
            result.errors.append(f"Duplicate DOI: {doi} (entries: {seen_doi[doi]}, {entry.key})")
        else:
            seen_doi[doi] = entry.key

    return result


def validate_dois(entries: list[Entry]) -> ValidationResult:
    result = ValidationResult()
    for entry in entries:
        raw_doi = entry.fields.get("doi", "")
        if not raw_doi:
            continue
        doi = normalize_doi(raw_doi)
        if doi and not DOI_PATTERN.match(doi):
            result.errors.append(f"[{entry.key}] invalid DOI format: {raw_doi}")
    return result


def collect_urls(entries: list[Entry]) -> dict[str, set[str]]:
    collected: dict[str, set[str]] = {}
    for entry in entries:
        urls: set[str] = set()
        for field in URL_FIELDS:
            for url in split_possible_urls(entry.fields.get(field, "")):
                urls.add(url)
        doi = normalize_doi(entry.fields.get("doi", ""))
        if doi:
            urls.add(f"https://doi.org/{doi}")
        if urls:
            collected[entry.key] = urls
    return collected


def request_url(url: str) -> tuple[bool, str]:
    headers = {"User-Agent": USER_AGENT}
    methods = ("HEAD", "GET")
    for method in methods:
        retries = 0
        while retries <= HTTP_MAX_RETRIES:
            request = urllib.request.Request(url=url, method=method, headers=headers)
            try:
                with urllib.request.urlopen(request, timeout=HTTP_TIMEOUT_SECONDS) as response:
                    status = response.status
                    if 200 <= status < 400:
                        return True, f"{status}"
                    if status in (403, 405):
                        return True, f"{status}"
                    return False, f"{status}"
            except urllib.error.HTTPError as error:
                if error.code in (403, 405):
                    return True, str(error.code)
                if method == "HEAD" and error.code in (400, 404, 405, 429, 500, 501):
                    break
                return False, str(error.code)
            except (urllib.error.URLError, TimeoutError):
                retries += 1
                if retries <= HTTP_MAX_RETRIES:
                    time.sleep(0.5 * retries)
                else:
                    return False, "timeout"
        # fallback to GET when HEAD fails with method-related status
    return False, "unreachable"


def validate_links(entries: list[Entry]) -> ValidationResult:
    result = ValidationResult()
    entry_urls = collect_urls(entries)
    unique_urls = sorted({url for urls in entry_urls.values() for url in urls})

    url_status_cache: dict[str, tuple[bool, str]] = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=WORKERS) as executor:
        future_map = {executor.submit(request_url, url): url for url in unique_urls}
        for future in concurrent.futures.as_completed(future_map):
            url = future_map[future]
            try:
                url_status_cache[url] = future.result()
            except Exception:
                url_status_cache[url] = (False, "exception")

    for entry_key, urls in entry_urls.items():
        for url in sorted(urls):
            ok, detail = url_status_cache.get(url, (False, "unknown"))
            if not ok:
                result.errors.append(f"[{entry_key}] dead link: {url} ({detail})")
    return result


def run_validation(bib_path: Path, skip_links: bool = False) -> ValidationResult:
    content = bib_path.read_text(encoding="utf-8")
    entries = parse_bib_entries(content)
    combined = ValidationResult()
    if not entries:
        combined.errors.append("No BibTeX entries could be parsed.")
        return combined

    combined.extend(validate_required_fields(entries))
    combined.extend(validate_duplicates(entries))
    combined.extend(validate_dois(entries))
    if not skip_links:
        combined.extend(validate_links(entries))
    return combined


def print_result(result: ValidationResult) -> None:
    if result.errors:
        print("Validation errors:")
        for item in result.errors:
            print(f"  - {item}")
    if result.warnings:
        print("Validation warnings:")
        for item in result.warnings:
            print(f"  - {item}")
    if not result.errors and not result.warnings:
        print("papers.bib validation passed.")


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate papers.bib")
    parser.add_argument("bib_path", nargs="?", default="_bibliography/papers.bib")
    parser.add_argument("--skip-links", action="store_true", help="Skip external link checks")
    args = parser.parse_args()

    bib_path = Path(args.bib_path)
    if not bib_path.exists():
        print(f"File not found: {bib_path}", file=sys.stderr)
        return 2

    result = run_validation(bib_path, skip_links=args.skip_links)
    print_result(result)
    return 1 if result.has_errors() else 0


if __name__ == "__main__":
    sys.exit(main())

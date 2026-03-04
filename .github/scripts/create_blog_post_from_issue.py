#!/usr/bin/env python3
"""Generate a blog post markdown file from a GitHub issue form.

This script is intended to run in GitHub Actions on the `issues` event.
It parses issue form sections, downloads image attachments embedded in the
post body, stores them under assets/img/posts, and rewrites markdown image
links to local asset paths.
"""

from __future__ import annotations

import datetime as dt
import json
import mimetypes
import os
import pathlib
import re
import sys
import unicodedata
import urllib.parse
import urllib.request
from typing import Dict, List, Tuple

REPO_ROOT = pathlib.Path(".").resolve()
POSTS_ROOT = REPO_ROOT / "_posts"
IMAGES_ROOT = REPO_ROOT / "assets" / "img" / "posts"
SECTION_PATTERN = re.compile(r"^###\s+(.+?)\s*\n([\s\S]*?)(?=^###\s+|\Z)", re.MULTILINE)
MARKDOWN_IMAGE_PATTERN = re.compile(r"!\[(?P<alt>[^\]]*)\]\((?P<url>https?://[^\s)]+)\)")
NO_RESPONSE = "_No response_"


class InputError(RuntimeError):
    """Raised for invalid or missing issue form fields."""


def load_issue_from_event() -> dict:
    event_path = os.environ.get("GITHUB_EVENT_PATH")
    if not event_path:
        raise InputError("GITHUB_EVENT_PATH is not set")

    with open(event_path, "r", encoding="utf-8") as f:
        payload = json.load(f)

    issue = payload.get("issue")
    if not issue:
        raise InputError("No issue payload found")
    return issue


def parse_sections(body: str) -> Dict[str, str]:
    sections: Dict[str, str] = {}
    for match in SECTION_PATTERN.finditer(body):
        title = match.group(1).strip()
        value = match.group(2).strip()
        if value == NO_RESPONSE:
            value = ""
        sections[title] = value
    return sections


def first_non_empty(sections: Dict[str, str], candidates: List[str], required: bool = False) -> str:
    for key in candidates:
        value = sections.get(key, "").strip()
        if value:
            return value
    if required:
        raise InputError(f"Missing required field. Tried keys: {', '.join(candidates)}")
    return ""


def normalize_language(value: str) -> str:
    value = value.strip().lower()
    if value in {"ja", "en-us"}:
        return value
    return "ja"


def parse_iso_date(value: str) -> str:
    try:
        dt.date.fromisoformat(value)
    except ValueError as exc:
        raise InputError(f"Invalid date '{value}'. Expected YYYY-MM-DD.") from exc
    return value


def slugify(text: str) -> str:
    normalized = unicodedata.normalize("NFKD", text)
    ascii_text = normalized.encode("ascii", "ignore").decode("ascii")
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", ascii_text).strip("-").lower()
    return slug


def normalize_slug(slug: str) -> str:
    slug = slug.strip().lower()
    slug = re.sub(r"[^a-z0-9-]+", "-", slug)
    slug = re.sub(r"-{2,}", "-", slug).strip("-")
    return slug


def parse_csv_list(value: str) -> List[str]:
    if not value:
        return []
    items = [part.strip() for part in re.split(r"[,\n]", value) if part.strip()]
    return items


def yaml_quote(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def yaml_inline_list(items: List[str]) -> str:
    if not items:
        return ""
    return "[" + ", ".join(yaml_quote(item) for item in items) + "]"


def is_github_attachment_url(url: str) -> bool:
    parsed = urllib.parse.urlparse(url)
    host = parsed.netloc.lower()
    if host == "github.com" and parsed.path.startswith("/user-attachments/assets/"):
        return True
    if host in {"user-images.githubusercontent.com", "private-user-images.githubusercontent.com"}:
        return True
    return False


def guess_extension(url: str, content_type: str) -> str:
    known_from_url = pathlib.Path(urllib.parse.urlparse(url).path).suffix.lower()
    if known_from_url in {
        ".jpg",
        ".jpeg",
        ".png",
        ".gif",
        ".webp",
        ".svg",
        ".bmp",
        ".tiff",
        ".mp4",
        ".mov",
        ".webm",
    }:
        return known_from_url

    mapping = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/gif": ".gif",
        "image/webp": ".webp",
        "image/svg+xml": ".svg",
        "image/bmp": ".bmp",
        "image/tiff": ".tiff",
        "video/mp4": ".mp4",
        "video/quicktime": ".mov",
        "video/webm": ".webm",
    }

    if content_type:
        content_type = content_type.split(";", 1)[0].strip().lower()
        if content_type in mapping:
            return mapping[content_type]
        guessed = mimetypes.guess_extension(content_type)
        if guessed:
            return guessed

    return ".bin"


def download_attachment(url: str, output_path: pathlib.Path) -> None:
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "github-actions-blog-post-bot",
            "Accept": "*/*",
        },
    )
    with urllib.request.urlopen(req, timeout=60) as response:
        output_path.write_bytes(response.read())


def replace_attachment_images(
    markdown: str,
    date_str: str,
    slug: str,
    issue_number: int,
) -> Tuple[str, List[str], List[str]]:
    IMAGES_ROOT.mkdir(parents=True, exist_ok=True)

    replaced_files: List[str] = []
    warnings: List[str] = []
    cache: Dict[str, str] = {}
    counter = 0

    def _replacement(match: re.Match) -> str:
        nonlocal counter

        alt = match.group("alt")
        url = match.group("url")

        if not is_github_attachment_url(url):
            return match.group(0)

        if url in cache:
            local_rel = cache[url]
            return f"![{alt}]({local_rel})"

        counter += 1
        basename = f"{date_str}_{slug}_issue{issue_number}_{counter:02d}"

        try:
            head_req = urllib.request.Request(
                url,
                headers={"User-Agent": "github-actions-blog-post-bot", "Accept": "*/*"},
                method="HEAD",
            )
            content_type = ""
            with urllib.request.urlopen(head_req, timeout=60) as response:
                content_type = response.headers.get("Content-Type", "")
        except Exception:
            content_type = ""

        extension = guess_extension(url, content_type)
        filename = f"{basename}{extension}"
        output_path = IMAGES_ROOT / filename

        try:
            download_attachment(url, output_path)
        except Exception as exc:  # pragma: no cover
            warnings.append(f"Failed to download attachment: {url} ({exc})")
            return match.group(0)

        local_rel = f"/assets/img/posts/{filename}"
        cache[url] = local_rel
        replaced_files.append(local_rel)
        return f"![{alt}]({local_rel})"

    replaced_markdown = MARKDOWN_IMAGE_PATTERN.sub(_replacement, markdown)
    return replaced_markdown, replaced_files, warnings


def choose_post_path(date_str: str, slug: str, lang: str, issue_number: int) -> pathlib.Path:
    lang_dir = POSTS_ROOT / lang
    lang_dir.mkdir(parents=True, exist_ok=True)

    candidate = lang_dir / f"{date_str}-{slug}.md"
    if candidate.exists():
        candidate = lang_dir / f"{date_str}-{slug}-issue{issue_number}.md"
    return candidate


def build_markdown(
    *,
    title: str,
    date_str: str,
    author: str,
    tags: List[str],
    categories: List[str],
    body_markdown: str,
) -> str:
    lines = [
        "---",
        "layout: post",
        f"title: {yaml_quote(title)}",
        f"date: {date_str}",
        "last_updated:",
        f"author: {yaml_quote(author)}",
        "thumbnail:",
        f"tags: {yaml_inline_list(tags)}" if tags else "tags:",
        f"categories: {yaml_inline_list(categories)}" if categories else "categories:",
        "---",
        "",
        body_markdown.rstrip(),
        "",
    ]
    return "\n".join(lines)


def set_output(name: str, value: str) -> None:
    output_file = os.environ.get("GITHUB_OUTPUT")
    if not output_file:
        return

    with open(output_file, "a", encoding="utf-8") as f:
        if "\n" in value:
            f.write(f"{name}<<EOF\n{value}\nEOF\n")
        else:
            f.write(f"{name}={value}\n")


def main() -> int:
    issue = load_issue_from_event()

    issue_number = int(issue.get("number"))
    issue_body = issue.get("body", "") or ""
    issue_user = issue.get("user", {}).get("login", "unknown")

    sections = parse_sections(issue_body)

    title = first_non_empty(sections, ["投稿タイトル", "Post title"], required=True)
    date_str = parse_iso_date(first_non_empty(sections, ["投稿日 (YYYY-MM-DD)", "Post date (YYYY-MM-DD)"], required=True))
    lang = normalize_language(first_non_empty(sections, ["言語", "Language"], required=False) or "ja")
    author = first_non_empty(sections, ["投稿者名", "Author"], required=True)
    requested_slug = first_non_empty(sections, ["URLスラッグ（英数字とハイフン、任意）", "URL slug (optional)"], required=False)
    tags = parse_csv_list(first_non_empty(sections, ["タグ（任意、カンマ区切り）", "Tags (optional, comma-separated)"], required=False))
    categories = parse_csv_list(first_non_empty(sections, ["カテゴリ（任意、カンマ区切り）", "Categories (optional, comma-separated)"], required=False))
    content = first_non_empty(sections, ["本文（Markdown）", "Body (Markdown)"], required=True)

    slug = normalize_slug(requested_slug) if requested_slug else slugify(title)
    if not slug:
        slug = f"post-{issue_number}"

    content, replaced_files, warnings = replace_attachment_images(
        markdown=content,
        date_str=date_str,
        slug=slug,
        issue_number=issue_number,
    )

    post_path = choose_post_path(date_str=date_str, slug=slug, lang=lang, issue_number=issue_number)

    post_markdown = build_markdown(
        title=title,
        date_str=date_str,
        author=author,
        tags=tags,
        categories=categories,
        body_markdown=content,
    )
    post_path.write_text(post_markdown, encoding="utf-8")

    relative_post_path = post_path.relative_to(REPO_ROOT).as_posix()

    pr_body_lines = [
        f"This PR was automatically created from issue #{issue_number}.",
        "",
        f"- Source issue: #{issue_number}",
        f"- Submitter: @{issue_user}",
        f"- Generated post: `{relative_post_path}`",
        f"- Downloaded attachments: {len(replaced_files)}",
    ]

    if replaced_files:
        pr_body_lines.extend(["", "Downloaded files:"])
        pr_body_lines.extend([f"- `{path.lstrip('/')}`" for path in replaced_files])

    if warnings:
        pr_body_lines.extend(["", "Warnings:"])
        pr_body_lines.extend([f"- {warning}" for warning in warnings])

    pr_body_lines.extend(["", f"Closes #{issue_number}"])

    set_output("branch_name", f"codex/blog-post-issue-{issue_number}")
    set_output("pr_title", f"[Blog Submission] {title}")
    set_output("commit_message", f"blog: add submission from issue #{issue_number}")
    set_output("pr_body", "\n".join(pr_body_lines))
    set_output("issue_number", str(issue_number))
    set_output("generated_post", relative_post_path)

    summary = [
        f"Generated post: {relative_post_path}",
        f"Downloaded attachments: {len(replaced_files)}",
        f"Warnings: {len(warnings)}",
    ]
    print("\n".join(summary))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except InputError as exc:
        print(f"Input error: {exc}", file=sys.stderr)
        raise SystemExit(1)

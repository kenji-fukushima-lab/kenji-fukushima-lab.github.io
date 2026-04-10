#!/usr/bin/env python3
"""Generate a profile update pull request from a GitHub issue form."""

from __future__ import annotations

import json
import os
import pathlib
import re
import sys
import traceback
from typing import Dict, List, Tuple
from urllib.parse import urlparse

SCRIPT_DIR = pathlib.Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
  sys.path.insert(0, str(SCRIPT_DIR))

import create_blog_post_from_issue as blog_post_automation

REPO_ROOT = pathlib.Path(".").resolve()
PROFILES_ROOT = REPO_ROOT / "_profiles"
PROFILE_IMAGES_ROOT = REPO_ROOT / "assets" / "img" / "people"
PROFILE_PHOTO_SOURCE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".tif", ".tiff", ".webp", ".bmp"}
PROFILE_PHOTO_FINAL_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".tiff"}
SECTION_PATTERN = re.compile(r"^###\s+(.+?)\s*\n([\s\S]*?)(?=^###\s+|\Z)", re.MULTILINE)
FRONT_MATTER_LINE_PATTERN = re.compile(r"^(?P<indent>\s*)(?P<key>[A-Za-z_][A-Za-z0-9_]*):(?P<rest>.*?)(?P<newline>\r?\n?)$")
NO_RESPONSE = "_No response_"
MAINTAINERS = {"kfuku52"}
KEEP_SENTINELS = {"keep current value", "keep current", "unchanged", "no change"}
CLEAR_SENTINELS = {"clear", "delete", "remove", "none", "null"}
GITHUB_USERNAME_PATTERN = re.compile(r"^[A-Za-z\d](?:[A-Za-z\d-]{0,37}[A-Za-z\d])?$")
EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+$")
ORCID_PATTERN = re.compile(r"^\d{4}-\d{4}-\d{4}-[\dX]{4}$", re.IGNORECASE)
X_HANDLE_PATTERN = re.compile(r"^[A-Za-z0-9_]{1,15}$")
PROFILE_SLUG_PATTERN = re.compile(r"^[A-Za-z0-9_.-]+$")
POSITION_KEYS = {
  "professor",
  "associate_professor",
  "assistant_professor",
  "lecturer",
  "tech_staff",
  "lab_manager",
  "postdoc",
  "researcher",
  "phd",
  "master",
  "intern",
  "undergraduate",
  "technician",
  "secretary",
  "staff",
  "alumni",
  "visiting",
  "collaborator",
  "other",
  "future",
}
STRICT_URL_FIELDS = {
  "website",
  "google_scholar",
  "linkedin",
  "amazon_author",
  "instagram",
  "facebook",
  "youtube",
  "tayo",
}
EDITABLE_FIELDS = [
  "name",
  "name_native",
  "position_key",
  "email",
  "website",
  "orcid",
  "google_scholar",
  "github",
  "linkedin",
  "twitter",
  "researchgate",
  "amazon_author",
  "instagram",
  "facebook",
  "youtube",
  "researchmap",
  "tayo",
]
PLAIN_TEXT_FIELDS = {"name", "name_native"}
FIELD_LABELS = {
  "name": "Name",
  "name_native": "Native script name",
  "position_key": "Position",
  "profile_photo": "Profile photo",
  "email": "Email",
  "website": "Website",
  "orcid": "ORCID",
  "google_scholar": "Google Scholar",
  "github": "GitHub username",
  "linkedin": "LinkedIn",
  "twitter": "X / Twitter",
  "researchgate": "ResearchGate",
  "amazon_author": "Amazon Author",
  "instagram": "Instagram",
  "facebook": "Facebook",
  "youtube": "YouTube",
  "researchmap": "researchmap",
  "tayo": "Tayo",
}
NO_UPDATES_PROVIDED_MESSAGE = "No update values were provided. Fill at least one field or use `CLEAR` to erase a value."
NO_PROFILE_FIELDS_CHANGED_MESSAGE = "No profile fields changed. Fill at least one field with a new value."
FIELD_TITLES = {
  "profile_file": ["プロフィールファイル指定 / Profile File Override (optional, maintainers only)"],
  "profile_photo": ["プロフィール写真 / Profile Photo (drag and drop one image, optional)"],
  "name": ["氏名 / Name"],
  "name_native": ["母語表記の氏名 / Native Script Name"],
  "position_key": ["役職 / Position Key"],
  "email": ["メールアドレス / Email"],
  "website": ["ウェブサイト / Website"],
  "orcid": ["ORCID"],
  "google_scholar": ["Google Scholar"],
  "github": ["GitHub ユーザー名 / GitHub Username"],
  "linkedin": ["LinkedIn"],
  "twitter": ["X / Twitter"],
  "researchgate": ["ResearchGate"],
  "amazon_author": ["Amazon Author"],
  "instagram": ["Instagram"],
  "facebook": ["Facebook"],
  "youtube": ["YouTube"],
  "researchmap": ["researchmap"],
  "tayo": ["Tayo"],
}


class InputError(RuntimeError):
  """Raised for invalid or missing issue form fields."""


def write_output(name: str, value: str) -> None:
  output_path = os.environ.get("GITHUB_OUTPUT")
  if not output_path:
    return
  with open(output_path, "a", encoding="utf-8") as fh:
    fh.write(f"{name}<<__EOF__\n{value}\n__EOF__\n")


def classify_input_error_message(message: str) -> str:
  if message == NO_PROFILE_FIELDS_CHANGED_MESSAGE:
    return "no_changes"
  if message == NO_UPDATES_PROVIDED_MESSAGE:
    return "no_input"
  return "input_error"


def load_issue_from_event() -> dict:
  event_path = os.environ.get("GITHUB_EVENT_PATH")
  if not event_path:
    raise InputError("GITHUB_EVENT_PATH is not set.")

  with open(event_path, "r", encoding="utf-8") as fh:
    payload = json.load(fh)

  issue = payload.get("issue")
  if not issue:
    raise InputError("No issue payload found.")
  return issue


def parse_sections(body: str) -> Dict[str, str]:
  sections: Dict[str, str] = {}
  for match in SECTION_PATTERN.finditer(body or ""):
    title = match.group(1).strip()
    value = match.group(2).strip()
    if value == NO_RESPONSE:
      value = ""
    sections[title] = value
  return sections


def first_non_empty(sections: Dict[str, str], candidates: List[str]) -> str:
  for key in candidates:
    value = sections.get(key, "").strip()
    if value:
      return value
  return ""


def slugify(text: str) -> str:
  slug = re.sub(r"[^a-zA-Z0-9]+", "-", text).strip("-").lower()
  return slug or "profile"


def split_value_and_comment(rest: str) -> Tuple[str, str]:
  in_single_quote = False
  in_double_quote = False
  escaped = False

  for index, char in enumerate(rest):
    if in_double_quote:
      if escaped:
        escaped = False
      elif char == "\\":
        escaped = True
      elif char == '"':
        in_double_quote = False
      continue

    if in_single_quote:
      if char == "'":
        in_single_quote = False
      continue

    if char == '"':
      in_double_quote = True
      continue
    if char == "'":
      in_single_quote = True
      continue
    if char == "#" and (index == 0 or rest[index - 1].isspace()):
      comment_start = index
      while comment_start > 0 and rest[comment_start - 1].isspace():
        comment_start -= 1
      return rest[:comment_start].strip(), rest[comment_start:]

  return rest.strip(), ""


def unquote_yaml_scalar(value: str) -> str:
  value = value.strip()
  if len(value) >= 2 and value.startswith("'") and value.endswith("'"):
    return value[1:-1].replace("''", "'")
  if len(value) >= 2 and value.startswith('"') and value.endswith('"'):
    return json.loads(value)
  return value


def format_yaml_scalar(value: str) -> str:
  if value == "":
    return ""

  lower_value = value.lower()
  if lower_value in {"null", "~", "true", "false", "yes", "no", "on", "off"}:
    return json.dumps(value, ensure_ascii=False)

  if value != value.strip():
    return json.dumps(value, ensure_ascii=False)

  if any(token in value for token in [": ", " #", "\n", "\r", "\t"]):
    return json.dumps(value, ensure_ascii=False)

  if value[0] in {'[', ']', '{', '}', ',', '&', '*', '#', '?', '|', '-', '<', '>', '=', '!', '%', '@', '`', '"', "'"}:
    return json.dumps(value, ensure_ascii=False)

  return value


def read_profile_data(profile_path: pathlib.Path) -> Dict[str, str]:
  lines = profile_path.read_text(encoding="utf-8").splitlines()
  if not lines or lines[0].strip() != "---":
    raise InputError(f"{profile_path} does not start with valid front matter.")

  data: Dict[str, str] = {}
  for line in lines[1:]:
    if line.strip() == "---":
      break
    match = FRONT_MATTER_LINE_PATTERN.match(line)
    if not match:
      continue
    key = match.group("key")
    value, _comment = split_value_and_comment(match.group("rest"))
    data[key] = unquote_yaml_scalar(value)
  return data


def collect_profile_files() -> List[pathlib.Path]:
  return sorted(
    path
    for path in PROFILES_ROOT.rglob("*.md")
    if path.name != "template.md" and path.is_file()
  )


def resolve_profile_override(raw_value: str, profile_paths: List[pathlib.Path]) -> pathlib.Path | None:
  if not raw_value:
    return None

  normalized = raw_value.strip().lstrip("./")
  normalized_no_suffix = normalized.removesuffix(".md")
  matches = []

  for path in profile_paths:
    rel_path = path.relative_to(REPO_ROOT).as_posix()
    rel_no_suffix = path.relative_to(REPO_ROOT).with_suffix("").as_posix()
    candidates = {
      rel_path,
      rel_no_suffix,
      path.name,
      path.stem,
      path.relative_to(PROFILES_ROOT).as_posix(),
      path.relative_to(PROFILES_ROOT).with_suffix("").as_posix(),
    }
    if normalized in candidates or normalized_no_suffix in candidates:
      matches.append(path)

  if len(matches) == 1:
    return matches[0]
  if len(matches) > 1:
    matched_paths = ", ".join(path.relative_to(REPO_ROOT).as_posix() for path in matches)
    raise InputError(f"Profile override '{raw_value}' matched multiple files: {matched_paths}")

  raise InputError(
    f"Could not resolve profile override '{raw_value}'. "
    "Use a file stem such as 'kenji_fukushima' or a path like '_profiles/current_members/kenji_fukushima.md'."
  )


def resolve_profile_path(issue_user_login: str, sections: Dict[str, str]) -> pathlib.Path:
  issue_user_login = issue_user_login.strip().lower()
  profile_paths = collect_profile_files()
  override_value = first_non_empty(sections, FIELD_TITLES["profile_file"])
  override_path = resolve_profile_override(override_value, profile_paths) if override_value else None

  if override_path is not None:
    if issue_user_login in MAINTAINERS:
      return override_path

    github_value = read_profile_data(override_path).get("github", "").strip().lower()
    if github_value != issue_user_login:
      raise InputError(
        "You can only update your own profile. The selected profile file does not match your GitHub username."
      )
    return override_path

  matches = []
  for path in profile_paths:
    github_value = read_profile_data(path).get("github", "").strip().lower()
    if github_value and github_value == issue_user_login:
      matches.append(path)

  if not matches:
    raise InputError(
      "No profile file matched your GitHub username. "
      "Ask a maintainer to add the correct `github:` field first, or use the override field if you are a maintainer."
    )
  if len(matches) > 1:
    matched_paths = ", ".join(path.relative_to(REPO_ROOT).as_posix() for path in matches)
    raise InputError(f"Multiple profile files matched your GitHub username: {matched_paths}")
  return matches[0]


def normalize_position_key(raw_value: str) -> str | None:
  normalized = raw_value.strip().lower()
  if not normalized or normalized in KEEP_SENTINELS:
    return None
  if normalized not in POSITION_KEYS:
    raise InputError(f"Invalid position_key '{raw_value}'.")
  return normalized


def is_valid_http_url(value: str) -> bool:
  parsed = urlparse(value)
  return parsed.scheme in {"http", "https"} and bool(parsed.netloc)


def normalize_service_url(field: str, value: str) -> str:
  if field in STRICT_URL_FIELDS:
    if not is_valid_http_url(value):
      raise InputError(f"{FIELD_LABELS[field]} must be a full URL starting with http:// or https://.")
    return value

  if field == "orcid":
    if is_valid_http_url(value):
      return value
    if ORCID_PATTERN.match(value):
      return f"https://orcid.org/{value.upper()}"
    raise InputError("ORCID must be a full URL or a valid ORCID ID such as 0000-0002-2353-9274.")

  if field == "twitter":
    if is_valid_http_url(value):
      return value
    handle = value.removeprefix("@")
    if X_HANDLE_PATTERN.match(handle):
      return f"https://x.com/{handle}"
    raise InputError("X / Twitter must be a full URL or a valid handle.")

  if field == "researchgate":
    if is_valid_http_url(value):
      return value
    if PROFILE_SLUG_PATTERN.match(value):
      return f"https://www.researchgate.net/profile/{value}"
    raise InputError("ResearchGate must be a full URL or a valid profile slug.")

  if field == "researchmap":
    if is_valid_http_url(value):
      return value
    if PROFILE_SLUG_PATTERN.match(value):
      return f"https://researchmap.jp/{value}"
    raise InputError("researchmap must be a full URL or a valid account ID.")

  return value


def normalize_field_value(field: str, raw_value: str, issue_user_login: str, allow_arbitrary_github_change: bool) -> str | None:
  value = raw_value.strip()
  if field == "position_key":
    return normalize_position_key(value)

  if not value:
    return None

  if value.lower() in KEEP_SENTINELS:
    return None
  if value.lower() in CLEAR_SENTINELS or value.upper() == "CLEAR":
    if field == "github" and not allow_arbitrary_github_change:
      raise InputError(
        "Only maintainers can clear or change the GitHub username field. "
        "For self-service updates it must stay matched to the account that submitted the issue."
      )
    return ""
  if "\n" in value or "\r" in value:
    raise InputError(f"{FIELD_LABELS[field]} must be a single line.")
  if field in PLAIN_TEXT_FIELDS:
    try:
      return blog_post_automation.validate_plain_text_submission_value(FIELD_LABELS[field], value)
    except blog_post_automation.InputError as exc:
      raise InputError(str(exc)) from exc
  if field == "email" and not EMAIL_PATTERN.match(value):
    raise InputError("Email must look like a valid email address.")
  if field == "github":
    if not GITHUB_USERNAME_PATTERN.match(value):
      raise InputError("GitHub username must be a valid GitHub account name.")
    if not allow_arbitrary_github_change and value.lower() != issue_user_login.lower():
      raise InputError(
        "For self-service updates, the GitHub username field must stay matched to the account that submitted the issue."
      )
  if field in STRICT_URL_FIELDS or field in {"orcid", "twitter", "researchgate", "researchmap"}:
    return normalize_service_url(field, value)
  return value


def extract_updates(sections: Dict[str, str], issue_user_login: str, allow_arbitrary_github_change: bool) -> Dict[str, str]:
  updates: Dict[str, str] = {}
  for field in EDITABLE_FIELDS:
    raw_value = first_non_empty(sections, FIELD_TITLES[field])
    normalized = normalize_field_value(field, raw_value, issue_user_login, allow_arbitrary_github_change)
    if normalized is not None:
      updates[field] = normalized
  return updates


def format_front_matter_line(indent: str, key: str, value: str, comment: str, newline: str) -> str:
  scalar = format_yaml_scalar(value)
  if scalar:
    return f"{indent}{key}: {scalar}{comment}{newline}"
  if comment:
    return f"{indent}{key}:{comment}{newline}"
  return f"{indent}{key}:{newline}"


def apply_updates(profile_path: pathlib.Path, updates: Dict[str, str]) -> List[str]:
  lines = profile_path.read_text(encoding="utf-8").splitlines(keepends=True)
  if not lines or lines[0].strip() != "---":
    raise InputError(f"{profile_path} does not start with valid front matter.")

  end_index = None
  for index in range(1, len(lines)):
    if lines[index].strip() == "---":
      end_index = index
      break
  if end_index is None:
    raise InputError(f"{profile_path} is missing the closing front matter delimiter.")

  front_matter_lines = lines[1:end_index]
  updated_lines: List[str] = []
  seen_keys = set()
  changed_fields: List[str] = []

  for line in front_matter_lines:
    match = FRONT_MATTER_LINE_PATTERN.match(line)
    if not match:
      updated_lines.append(line)
      continue

    key = match.group("key")
    seen_keys.add(key)
    if key not in updates:
      updated_lines.append(line)
      continue

    current_value, comment = split_value_and_comment(match.group("rest"))
    current_value = unquote_yaml_scalar(current_value)
    new_value = updates[key]
    if current_value == new_value:
      updated_lines.append(line)
      continue

    updated_lines.append(
      format_front_matter_line(match.group("indent"), key, new_value, comment, match.group("newline") or "\n")
    )
    changed_fields.append(key)

  for field in EDITABLE_FIELDS:
    if field not in updates or field in seen_keys:
      continue
    if updates[field] == "":
      continue
    updated_lines.append(format_front_matter_line("", field, updates[field], "", "\n"))
    changed_fields.append(field)

  updated_content = "".join([lines[0], *updated_lines, *lines[end_index:]])
  profile_path.write_text(updated_content, encoding="utf-8")
  return changed_fields


def apply_single_front_matter_update(profile_path: pathlib.Path, key: str, value: str) -> bool:
  lines = profile_path.read_text(encoding="utf-8").splitlines(keepends=True)
  if not lines or lines[0].strip() != "---":
    raise InputError(f"{profile_path} does not start with valid front matter.")

  end_index = None
  for index in range(1, len(lines)):
    if lines[index].strip() == "---":
      end_index = index
      break
  if end_index is None:
    raise InputError(f"{profile_path} is missing the closing front matter delimiter.")

  front_matter_lines = lines[1:end_index]
  updated_lines: List[str] = []
  changed = False
  found = False

  for line in front_matter_lines:
    match = FRONT_MATTER_LINE_PATTERN.match(line)
    if not match:
      updated_lines.append(line)
      continue

    current_key = match.group("key")
    if current_key != key:
      updated_lines.append(line)
      continue

    found = True
    current_value, comment = split_value_and_comment(match.group("rest"))
    current_value = unquote_yaml_scalar(current_value)
    if current_value == value:
      updated_lines.append(line)
      continue

    updated_lines.append(
      format_front_matter_line(match.group("indent"), current_key, value, comment, match.group("newline") or "\n")
    )
    changed = True

  if not found:
    updated_lines.append(format_front_matter_line("", key, value, "", "\n"))
    changed = True

  if not changed:
    return False

  updated_content = "".join([lines[0], *updated_lines, *lines[end_index:]])
  profile_path.write_text(updated_content, encoding="utf-8")
  return True


def extract_profile_photo_source(sections: Dict[str, str]) -> Tuple[str, str] | None:
  raw_value = first_non_empty(sections, FIELD_TITLES["profile_photo"])
  if not raw_value:
    return None

  seen_urls = set()
  sources: List[Tuple[str, str]] = []

  for match in blog_post_automation.MARKDOWN_IMAGE_PATTERN.finditer(raw_value):
    url = match.group("url").strip()
    if not blog_post_automation.is_github_attachment_url(url) or url in seen_urls:
      continue
    seen_urls.add(url)
    sources.append((url, match.group("alt").strip() or "Profile photo"))

  for match in blog_post_automation.HTML_IMAGE_TAG_PATTERN.finditer(raw_value):
    attributes = blog_post_automation.parse_html_attributes(match.group("attrs"))
    url = attributes.get("src", "").strip()
    if not url or not blog_post_automation.is_github_attachment_url(url) or url in seen_urls:
      continue
    seen_urls.add(url)
    sources.append((url, attributes.get("alt", "").strip() or "Profile photo"))

  if not sources:
    raise InputError(
      "Profile photo must be uploaded by dragging and dropping exactly one image into the profile photo field."
    )
  if len(sources) > 1:
    raise InputError("Attach exactly one profile photo in the profile photo field.")
  return sources[0]


def choose_profile_photo_stem(profile_path: pathlib.Path, profile_data: Dict[str, str]) -> str:
  current_image = profile_data.get("image", "").strip()
  if current_image:
    current_path = pathlib.PurePosixPath(current_image)
    if len(current_path.parts) == 2 and current_path.parts[0] == "people" and current_path.stem and current_path.stem != "default":
      return current_path.stem
  return profile_path.stem


def validate_profile_photo_source_extension(extension: str) -> str:
  normalized = extension.lower()
  if normalized not in PROFILE_PHOTO_SOURCE_EXTENSIONS:
    raise InputError(
      "Profile photo must be a supported raster image attachment (JPG, PNG, GIF, TIFF, WEBP, or BMP)."
    )
  if normalized == ".tif":
    return ".tiff"
  return normalized


def ensure_supported_profile_photo_output(
  data: bytes,
  extension: str,
  source_url: str,
  warnings: List[str],
) -> Tuple[bytes, str]:
  normalized_extension = extension.lower()
  if normalized_extension == ".tif":
    normalized_extension = ".tiff"
  if normalized_extension == ".jpeg":
    normalized_extension = ".jpg"

  if normalized_extension in PROFILE_PHOTO_FINAL_EXTENSIONS:
    return data, normalized_extension

  if normalized_extension not in {".webp", ".bmp"}:
    raise InputError(
      "Profile photo must be saved as a site-supported image format (JPG, PNG, GIF, or TIFF)."
    )

  if blog_post_automation.Image is None or blog_post_automation.ImageOps is None:
    raise InputError(
      "Profile photo could not be converted to a site-supported format because Pillow is unavailable."
    )

  try:
    with blog_post_automation.Image.open(blog_post_automation.io.BytesIO(data)) as image:
      if getattr(image, "is_animated", False) and getattr(image, "n_frames", 1) > 1:
        raise InputError("Animated profile photos are not supported. Please upload a static image.")

      normalized = blog_post_automation.ImageOps.exif_transpose(image)
      icc_profile = image.info.get("icc_profile")
      has_alpha = blog_post_automation.image_has_alpha(normalized)
      candidate_extensions = (".png", ".jpg") if has_alpha else (".jpg", ".png")

      try:
        for scale in blog_post_automation.RESIZE_SCALE_STEPS:
          resized = blog_post_automation.resize_image(normalized, scale)
          try:
            for candidate_extension in candidate_extensions:
              for quality in blog_post_automation.budget_quality_steps(candidate_extension):
                candidate_data = blog_post_automation.encode_image_candidate(
                  resized,
                  candidate_extension,
                  quality=quality,
                  icc_profile=icc_profile,
                )
                if len(candidate_data) <= blog_post_automation.MAX_IMAGE_BYTES:
                  warnings.append(
                    f"Converted unsupported profile photo format {normalized_extension} to {candidate_extension}"
                  )
                  return candidate_data, candidate_extension
          finally:
            resized.close()
      finally:
        normalized.close()
  except InputError:
    raise
  except Exception as exc:
    raise InputError(f"Failed to convert the profile photo into a supported image format: {source_url}") from exc

  raise InputError(
    f"Profile photo could not be converted to a site-supported format under {blog_post_automation.MAX_IMAGE_BYTES} bytes: {source_url}"
  )


def save_profile_photo_attachment(
  profile_path: pathlib.Path,
  profile_data: Dict[str, str],
  source_url: str,
) -> Tuple[str, str, List[str], bool]:
  PROFILE_IMAGES_ROOT.mkdir(parents=True, exist_ok=True)

  warnings: List[str] = []
  try:
    data, content_type = blog_post_automation.download_attachment(source_url)
    extension = blog_post_automation.guess_extension(source_url, content_type)
    if extension == ".bin":
      extension = blog_post_automation.guess_extension_from_bytes(data)
    extension = validate_profile_photo_source_extension(extension)
    data, extension = blog_post_automation.optimize_image_asset(data, extension, source_url, warnings)
    data, extension = ensure_supported_profile_photo_output(data, extension, source_url, warnings)
  except blog_post_automation.InputError as exc:
    raise InputError(str(exc)) from exc
  except Exception as exc:
    raise InputError(f"Failed to download or process the profile photo: {source_url} ({exc})") from exc

  stem = choose_profile_photo_stem(profile_path, profile_data)
  filename = f"{stem}{extension}"
  output_path = PROFILE_IMAGES_ROOT / filename
  relative_asset_path = output_path.relative_to(REPO_ROOT).as_posix()
  profile_image_value = f"people/{filename}"

  previous_bytes = output_path.read_bytes() if output_path.exists() else None
  file_changed = previous_bytes != data
  if file_changed:
    output_path.write_bytes(data)

  return relative_asset_path, profile_image_value, warnings, file_changed


def build_pr_body(
  issue: dict,
  profile_path: pathlib.Path,
  changed_fields: List[str],
  profile_name: str,
  photo_asset_path: str,
  warnings: List[str],
) -> str:
  issue_number = issue["number"]
  issue_url = issue["html_url"]
  issue_user = issue["user"]["login"]
  relative_profile_path = profile_path.relative_to(REPO_ROOT).as_posix()
  formatted_fields = "\n".join(f"- {FIELD_LABELS[field]}" for field in changed_fields)
  body = (
    f"Automated profile update PR for **{profile_name}**.\n\n"
    f"- Source issue: #{issue_number} ({issue_url})\n"
    f"- Submitted by: @{issue_user}\n"
    f"- Updated file: `{relative_profile_path}`\n\n"
    f"Updated fields:\n{formatted_fields}\n\n"
    f"Closes #{issue_number}"
  )
  if photo_asset_path:
    body = body.replace(
      f"- Updated file: `{relative_profile_path}`\n\n",
      f"- Updated file: `{relative_profile_path}`\n- Updated photo asset: `{photo_asset_path}`\n\n",
    )
  if warnings:
    body = f"{body}\n\nWarnings:\n" + "\n".join(f"- {warning}" for warning in warnings)
  return body


def main() -> int:
  issue = load_issue_from_event()
  write_output("issue_number", str(issue["number"]))

  issue_user_login = issue["user"]["login"]
  sections = parse_sections(issue.get("body", ""))
  profile_path = resolve_profile_path(issue_user_login, sections)
  profile_data = read_profile_data(profile_path)
  allow_arbitrary_github_change = issue_user_login.strip().lower() in MAINTAINERS
  updates = extract_updates(sections, issue_user_login, allow_arbitrary_github_change)
  profile_photo_source = extract_profile_photo_source(sections)
  if not updates and profile_photo_source is None:
    raise InputError(NO_UPDATES_PROVIDED_MESSAGE)

  changed_fields: List[str] = []
  if updates:
    changed_fields.extend(apply_updates(profile_path, updates))

  photo_asset_path = ""
  photo_warnings: List[str] = []
  if profile_photo_source is not None:
    relative_photo_asset_path, profile_image_value, photo_warnings, photo_file_changed = save_profile_photo_attachment(
      profile_path,
      profile_data,
      profile_photo_source[0],
    )
    image_field_changed = apply_single_front_matter_update(profile_path, "image", profile_image_value)
    if photo_file_changed or image_field_changed:
      changed_fields.append("profile_photo")
      photo_asset_path = relative_photo_asset_path

  if not changed_fields:
    raise InputError(NO_PROFILE_FIELDS_CHANGED_MESSAGE)

  updated_profile_data = read_profile_data(profile_path)
  profile_name = updated_profile_data.get("name", profile_path.stem)

  relative_profile_path = profile_path.relative_to(REPO_ROOT).as_posix()
  branch_name = f"automation/profile-update-{issue['number']}-{slugify(profile_path.stem)}"
  issue_title = f"Profile update for {profile_name}"
  commit_message = f"Update profile for {profile_name}"
  pr_title = f"Update profile for {profile_name}"
  pr_body = build_pr_body(issue, profile_path, changed_fields, profile_name, photo_asset_path, photo_warnings)
  add_paths = [relative_profile_path]
  if photo_asset_path:
    add_paths.append(photo_asset_path)

  write_output("generated_profile", relative_profile_path)
  write_output("add_paths", "\n".join(add_paths))
  write_output("branch_name", branch_name)
  write_output("issue_title", issue_title)
  write_output("commit_message", commit_message)
  write_output("pr_title", pr_title)
  write_output("pr_body", pr_body)
  return 0


if __name__ == "__main__":
  try:
    sys.exit(main())
  except InputError as exc:
    message = str(exc)
    write_output("error_message", message)
    write_output("error_code", classify_input_error_message(message))
    print(message, file=sys.stderr)
    sys.exit(1)
  except Exception:
    message = "Unexpected error while generating the profile update PR. Check the workflow logs or ask a maintainer."
    write_output("error_message", message)
    write_output("error_code", "unexpected_error")
    traceback.print_exc()
    sys.exit(1)

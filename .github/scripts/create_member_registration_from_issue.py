#!/usr/bin/env python3
"""Create a new member profile only after Kenji approves the submitted issue."""

from __future__ import annotations

import datetime
import json
import os
import pathlib
import re
import sys
import tempfile
import traceback

SCRIPT_DIR = pathlib.Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

import create_profile_update_from_issue as profiles

PUBLICATION_DATE_TITLE = "公開希望日 / Publication Date (YYYY-MM-DD, Asia/Tokyo)"
APPROVER = "kfuku52"
APPROVAL_COMMAND = "/approve-member"


def load_approved_submission() -> tuple[dict, dict]:
    event_path = os.environ.get("GITHUB_EVENT_PATH")
    if not event_path or os.environ.get("GITHUB_EVENT_NAME") != "issue_comment":
        raise profiles.InputError("Member registration requires a new approval comment from @kfuku52.")
    payload = json.loads(pathlib.Path(event_path).read_text(encoding="utf-8"))
    comment = payload.get("comment", {})
    issue = payload.get("issue", {})
    if (
        payload.get("action") != "created"
        or comment.get("user", {}).get("login") != APPROVER
        or comment.get("body", "").strip() != APPROVAL_COMMAND
        or not comment.get("id")
        or issue.get("state") != "open"
        or "pull_request" in issue
    ):
        raise profiles.InputError("Only @kfuku52 can approve an open member registration issue with /approve-member.")
    return issue, comment


def publication_date(sections: dict[str, str]) -> str:
    value = sections.get(PUBLICATION_DATE_TITLE, "").strip()
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
        raise profiles.InputError("Publication date is required in YYYY-MM-DD format (Asia/Tokyo).")
    try:
        datetime.date.fromisoformat(value)
    except ValueError as exc:
        raise profiles.InputError("Publication date must be a valid calendar date.") from exc
    return value


def main() -> int:
    issue, comment = load_approved_submission()
    sections = profiles.parse_sections(issue.get("body", ""))
    publish_on = publication_date(sections)
    author = issue["user"]["login"]
    updates = profiles.extract_updates(sections, author, author.lower() in profiles.MAINTAINERS)
    if not updates.get("name"):
        raise profiles.InputError("Name is required for a new member.")
    if updates.get("position_key") not in profiles.POSITION_KEYS - {"future", "alumni"}:
        raise profiles.InputError("Choose the new member's role; future and alumni are not registration roles.")
    username = updates.get("github", "")
    if not username or not profiles.GITHUB_USERNAME_PATTERN.fullmatch(username):
        raise profiles.InputError("A valid GitHub username is required for member registration.")
    updates["github"] = username
    photo_source = profiles.extract_profile_photo_source(sections)
    profile_path = profiles.PROFILES_ROOT / "current_members" / f"{username.lower()}.md"
    if profile_path.exists() or any(
        profiles.read_profile_data(path).get("github", "").lower() == username.lower()
        for path in profiles.collect_profile_files()
    ):
        raise profiles.InputError("This member already has a profile. Use the profile update form instead.")

    # Reuse the established member schema and attachment checks. Submitted values
    # cannot set the publication approval or select an arbitrary file path.
    paths = [profile_path.relative_to(profiles.REPO_ROOT).as_posix()]
    warnings = []
    photo_stem = f"member-registration-{issue['number']}-{username.lower()}"
    if photo_source and any(profiles.PROFILE_IMAGES_ROOT.glob(f"{photo_stem}.*")):
        raise profiles.InputError("The registration photo filename already exists. Ask Kenji to review the existing asset.")

    template = profiles.PROFILES_ROOT / "template" / "template.md"
    profile_path.parent.mkdir(parents=True, exist_ok=True)
    # A failed photo must not leave a readable, partially generated member record.
    # Stage on the same filesystem so the final rename is atomic.
    with tempfile.TemporaryDirectory(prefix=".member-registration-", dir=profile_path.parent) as directory:
        staged_profile = pathlib.Path(directory) / profile_path.name
        staged_profile.write_text(template.read_text(encoding="utf-8"), encoding="utf-8")
        profiles.apply_updates(staged_profile, updates)
        for key, value in {
            "publish_on": publish_on,
            "registration_issue": str(issue["number"]),
            "registration_approved_by": APPROVER,
            "registration_approval_comment": str(comment["id"]),
        }.items():
            profiles.apply_single_front_matter_update(staged_profile, key, value)

        if photo_source:
            photo_data = profiles.read_profile_data(staged_profile)
            # Isolate registration assets even for accounts named "default" or
            # whose username matches an existing member's photo filename.
            photo_data["image"] = f"people/{photo_stem}.png"
            asset, image, warnings, _changed = profiles.save_profile_photo_attachment(
                staged_profile, photo_data, photo_source[0]
            )
            profiles.apply_single_front_matter_update(staged_profile, "image", image)
            paths.append(asset)
        staged_profile.replace(profile_path)

    name = updates["name"]
    body = (
        f"Register **{name}** as a lab member.\n\n"
        f"- Submission: {issue['html_url']}\n"
        f"- Submitted by: @{author}\n"
        f"- Approved by: @{APPROVER} ({comment['html_url']})\n"
        f"- Website publication date: **{publish_on} (Asia/Tokyo)**\n"
        f"- Profile: `{paths[0]}`\n\n"
        "After review and merge, the next successful build on or after the publication date will list this member. "
        "The normal daily build starts at 08:30 Japan time and may run later. "
        "The issue, PR, source files, and attachments are public immediately.\n\n"
        "This PR contains the issue content from the approval event. "
        "Editing the issue does not update this PR; @kfuku52 must post a new /approve-member comment to approve revised content.\n\n"
        f"Closes #{issue['number']}"
    )
    if warnings:
        body += "\n\nAttachment processing:\n" + "\n".join(f"- {warning}" for warning in warnings)
    for key, value in {
        "generated_profile": paths[0],
        "add_paths": "\n".join(paths),
        "branch_name": f"automation/member-registration-{issue['number']}",
        "issue_title": f"Member registration for {name}",
        "commit_message": f"Register member {name}",
        "pr_title": f"Register member {name} for publication on {publish_on}",
        "pr_body": body,
    }.items():
        profiles.write_output(key, value)
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except profiles.InputError as exc:
        profiles.write_output("error_message", str(exc))
        print(str(exc), file=sys.stderr)
        sys.exit(1)
    except Exception:
        profiles.write_output("error_message", "Registration failed. Check the workflow logs or contact Kenji.")
        traceback.print_exc()
        sys.exit(1)

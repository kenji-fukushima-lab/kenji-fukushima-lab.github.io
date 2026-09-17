#!/usr/bin/env python3
"""Select local validation; unknown paths or an uncertain Git range use all checks."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[2]
ALL = ("syntax", "python", "javascript", "ruby", "bibliography", "images", "formatting")
DOCUMENTS = {"AGENTS.md", "README.md", "CONTRIBUTING.md", "INSTALL.md", "LICENSE"}


def select(paths: list[str]) -> tuple[str, ...]:
    required = set()
    for path in paths:
        # Only non-site documentation and isolated unit-test files are narrowed.
        # Runtime sources, fixtures, manifests and build/CI changes stay full.
        if path in DOCUMENTS or (path.startswith("docs/") and path.endswith(".md")):
            required.add("formatting")
        elif re.fullmatch(r"tests/test_[^/]+\.py", path):
            required.update(("syntax", "python", "formatting"))
        elif re.fullmatch(r"tests/js/[^/]+\.test\.js", path):
            required.update(("javascript", "formatting"))
        elif re.fullmatch(r"test/[^/]+\.rb", path):
            required.update(("ruby", "formatting"))
        else:
            return ALL
    return tuple(check for check in ALL if check in required)


def git(root: Path, *args: str) -> bytes:
    return subprocess.check_output(["git", *args], cwd=root, stderr=subprocess.PIPE, timeout=30)


def changed_paths(root: Path, base: str, head: str) -> list[str]:
    # Disable rename detection so both old and new consumers affect selection.
    revisions = [git(root, "rev-parse", "--verify", "--end-of-options", f"{ref}^{{commit}}").decode().strip() for ref in (base, head)]
    return git(root, "diff", "--name-only", "--no-renames", "-z", *revisions, "--").decode().split("\0")[:-1]


def from_push(text: str, root: Path = ROOT) -> tuple[tuple[str, ...], str]:
    updates = []
    for line in text.splitlines():
        fields = line.split()
        if len(fields) != 4 or not all(re.fullmatch(r"[a-f0-9]{40,64}", fields[i]) for i in (1, 3)):
            raise ValueError("Invalid Git pre-push input")
        if set(fields[1]) != {"0"} and fields[1] != fields[3]:
            updates.append(fields)
    if not updates:
        return (), "No updated commit (unchanged refs or deletion only)"
    try:
        head = git(root, "rev-parse", "HEAD").decode().strip()
        if git(root, "status", "--porcelain", "--untracked-files=normal"):
            return ALL, "Worktree differs from committed input; run full worktree checks"
        paths = []
        for local_ref, local_oid, remote_ref, remote_oid in updates:
            if local_oid != head or not local_ref.startswith("refs/heads/") or not remote_ref.startswith("refs/heads/"):
                return ALL, "Non-HEAD branch or tag update; run full worktree checks"
            if set(remote_oid) == {"0"}:
                return ALL, "New remote ref; no prior commit to compare"
            paths.extend(changed_paths(root, remote_oid, local_oid))
        return select(paths), "Selected from all outgoing ref changes"
    except (subprocess.SubprocessError, UnicodeError):
        return ALL, "Remote history unavailable; run full worktree checks"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--pre-push", action="store_true")
    mode.add_argument("--base", help="Compare this local revision with HEAD and local changes")
    mode.add_argument("--full", action="store_true")
    parser.add_argument("--json", action="store_true", help="Inspect the selection without running checks")
    args = parser.parse_args()
    checks, reason = ALL, "Full validation requested or no comparison base supplied"
    if args.pre_push:
        checks, reason = from_push(sys.stdin.read())
    elif args.base:
        try:
            paths = changed_paths(ROOT, args.base, "HEAD")
            paths += git(ROOT, "diff", "HEAD", "--name-only", "--no-renames", "-z", "--").decode().split("\0")[:-1]
            paths += git(ROOT, "ls-files", "--others", "--exclude-standard", "-z").decode().split("\0")[:-1]
            checks, reason = select(paths), "Selected from base, staged, unstaged and untracked changes"
        except (subprocess.SubprocessError, UnicodeError):
            checks, reason = ALL, "Comparison unavailable; run full worktree checks"
    if args.json:
        print(json.dumps({"checks": checks, "reason": reason}))
    else:
        print(reason, file=sys.stderr)
        print(" ".join(checks))


if __name__ == "__main__":
    main()

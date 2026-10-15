#!/usr/bin/env python3
"""Fetch only the history needed for an exact push or pull-request diff."""
import argparse
from pathlib import Path
import re
import subprocess


def git(root, *args, check=True):
    return subprocess.run(["git", "-C", str(root), *args], capture_output=True, text=True, check=check)


def prepare_history(event, *, head="", base="", before="", root=Path(".")):
    if event == "pull_request":
        revisions = [base, head]
    elif event == "push" and before and set(before) != {"0"}:
        revisions = [before, head]
    else:
        return
    for revision in revisions:
        if not re.fullmatch(r"[a-f0-9]{40,64}", revision):
            raise ValueError("CI history requires full commit IDs")
        if git(root, "cat-file", "-e", f"{revision}^{{commit}}", check=False).returncode:
            git(root, "fetch", "--no-tags", "--depth=1", "origin", revision)
    if event != "pull_request":
        return
    for depth in (32, 128, 512, 2048):
        if git(root, "merge-base", base, head, check=False).returncode == 0:
            return
        git(root, "fetch", "--no-tags", f"--depth={depth}", "origin", base, head)
    if git(root, "merge-base", base, head, check=False).returncode == 0:
        return
    if git(root, "rev-parse", "--is-shallow-repository").stdout.strip() == "true":
        git(root, "fetch", "--no-tags", "--unshallow", "origin", base, head)
    git(root, "merge-base", base, head)  # A missing merge base is a real failure.


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--event", required=True)
    parser.add_argument("--head", default="")
    parser.add_argument("--base", default="")
    parser.add_argument("--before", default="")
    args = parser.parse_args()
    prepare_history(args.event, head=args.head, base=args.base, before=args.before)


if __name__ == "__main__":
    main()

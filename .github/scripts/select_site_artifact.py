#!/usr/bin/env python3
"""Find a successful main-branch build artifact without rebuilding the site."""

import json
import os
import re
import urllib.request


def artifact_for_run(run, artifacts, repository):
    if (
        run.get("conclusion") != "success"
        or run.get("event") == "pull_request"
        or run.get("head_branch") not in {"main", "master"}
        or run.get("head_repository", {}).get("full_name") != repository
    ):
        return None
    sha = run.get("head_sha", "")
    if not re.fullmatch(r"[0-9a-f]{40}", sha):
        return None
    name = f"production-site-{sha}"
    for artifact in artifacts:
        if artifact.get("name") == name and not artifact.get("expired", True):
            return {"run_id": str(run["id"]), "sha": sha, "artifact": name, "found": "true"}
    return None


def main():
    repository = os.environ["GITHUB_REPOSITORY"]

    def get(path):
        request = urllib.request.Request(
            f"https://api.github.com/repos/{repository}/{path}",
            headers={"Authorization": f"Bearer {os.environ['GITHUB_TOKEN']}", "Accept": "application/vnd.github+json"},
        )
        with urllib.request.urlopen(request, timeout=30) as response:
            return json.load(response)

    source_run = os.environ.get("SOURCE_RUN_ID", "")
    if source_run:
        if not source_run.isdigit():
            raise ValueError("Invalid source run ID")
        runs = [get(f"actions/runs/{source_run}")]
    else:
        runs = get("actions/workflows/deploy.yml/runs?branch=main&status=success&per_page=20")["workflow_runs"]
    selected = None
    for run in runs:
        artifacts = get(f"actions/runs/{run['id']}/artifacts?per_page=100")["artifacts"]
        selected = artifact_for_run(run, artifacts, repository)
        if selected:
            break
    if not selected:
        if not source_run:
            raise RuntimeError("No unexpired production site. Run Deploy site first, then retry Link health.")
        print("This run did not produce a site artifact; no external-link scan is needed.")
        selected = {"found": "false"}
    with open(os.environ["GITHUB_OUTPUT"], "a", encoding="utf-8") as output:
        for key, value in selected.items():
            output.write(f"{key}={value}\n")


if __name__ == "__main__":
    main()

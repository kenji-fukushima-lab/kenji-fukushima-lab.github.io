#!/usr/bin/env python3
"""Run npm audit with a narrow, self-expiring exception for LHCI.

GHSA-jmr9-qjv8-65gv has no patched extract-zip release as of 2026-08-15.
LHCI reaches the package through Puppeteer, but this repository supplies an
installed Chrome binary and never invokes Puppeteer's archive extraction path.

Remove this exception and restore a direct `npm audit` workflow step when
extract-zip publishes a patched release or LHCI drops the dependency. Any new
advisory or change to the known dependency chain fails closed for review.
"""

from __future__ import annotations

import json
import subprocess
import sys
from collections.abc import Mapping
from typing import Any


ALLOWED_ADVISORY = "GHSA-jmr9-qjv8-65gv"
ALLOWED_VULNERABILITY_CHAIN = frozenset(
    {
        "@lhci/cli",
        "@lhci/utils",
        "@puppeteer/browsers",
        "extract-zip",
        "lighthouse",
        "puppeteer-core",
    }
)


def validate_audit_report(report: Mapping[str, Any]) -> list[str]:
    """Return reasons an audit report is not covered by the narrow exception."""
    if report.get("error"):
        return ["npm audit reported an operational error"]

    vulnerabilities = report.get("vulnerabilities", {})
    if not isinstance(vulnerabilities, Mapping):
        return ["npm audit returned an invalid vulnerabilities object"]
    if not vulnerabilities:
        return []

    errors: list[str] = []
    package_names = frozenset(str(name) for name in vulnerabilities)
    if package_names != ALLOWED_VULNERABILITY_CHAIN:
        unexpected = sorted(package_names - ALLOWED_VULNERABILITY_CHAIN)
        missing = sorted(ALLOWED_VULNERABILITY_CHAIN - package_names)
        if unexpected:
            errors.append(f"unexpected vulnerable packages: {', '.join(unexpected)}")
        if missing:
            errors.append(f"expected LHCI chain changed; missing: {', '.join(missing)}")

    advisory_ids: set[str] = set()
    for vulnerability in vulnerabilities.values():
        if not isinstance(vulnerability, Mapping):
            errors.append("npm audit returned an invalid vulnerability entry")
            continue
        via = vulnerability.get("via", [])
        if not isinstance(via, list):
            errors.append("npm audit returned an invalid via entry")
            continue
        for cause in via:
            if isinstance(cause, Mapping):
                advisory_id = cause.get("url", "").rstrip("/").rsplit("/", 1)[-1]
                if advisory_id:
                    advisory_ids.add(advisory_id)

    if advisory_ids != {ALLOWED_ADVISORY}:
        errors.append(
            "unexpected advisory set: "
            + (", ".join(sorted(advisory_ids)) if advisory_ids else "none")
        )

    direct = vulnerabilities.get("@lhci/cli", {})
    if not isinstance(direct, Mapping) or direct.get("isDirect") is not True:
        errors.append("the allowed dependency chain is no longer rooted at direct @lhci/cli")

    return errors


def main() -> int:
    result = subprocess.run(
        ["npm", "audit", "--json"],
        check=False,
        capture_output=True,
        text=True,
    )
    try:
        report = json.loads(result.stdout)
    except json.JSONDecodeError:
        print("npm audit did not return valid JSON", file=sys.stderr)
        if result.stderr:
            print(result.stderr, file=sys.stderr)
        return 1

    errors = validate_audit_report(report)
    if errors:
        print("Node.js dependency audit failed:", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1

    vulnerabilities = report.get("vulnerabilities", {})
    if vulnerabilities:
        print(
            f"Accepted temporary {ALLOWED_ADVISORY} exception for the verified LHCI-only chain."
        )
        print("Remove the exception when extract-zip or LHCI publishes a patched dependency.")
    else:
        print("Node.js dependency audit passed with no vulnerabilities.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

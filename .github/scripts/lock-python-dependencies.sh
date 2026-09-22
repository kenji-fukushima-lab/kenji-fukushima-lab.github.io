#!/usr/bin/env bash
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
# Ignore the previous constraints while resolving an intentional update.
sed '/^-c requirements-lock.txt$/d' requirements-build.txt requirements-test.txt requirements-audit.txt |
  uv pip compile - --upgrade --custom-compile-command "bash .github/scripts/lock-python-dependencies.sh" --python-version "$(cat .python-version)" --universal --generate-hashes --output-file requirements-lock.txt

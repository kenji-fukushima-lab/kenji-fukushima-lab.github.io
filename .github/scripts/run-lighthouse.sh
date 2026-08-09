#!/usr/bin/env bash
set -euo pipefail

repo_root=$(git rev-parse --show-toplevel)
cd "$repo_root"

rm -rf -- lighthouse-results-ci .lighthouseci
npx --no-install lhci autorun --config=.lighthouserc.cjs

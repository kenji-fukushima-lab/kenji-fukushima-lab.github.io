#!/bin/sh
set -eu

repo_root=$(git rev-parse --show-toplevel)
cd "$repo_root"

if ! command -v python3 >/dev/null 2>&1; then
  cat >&2 <<'EOF'
Python 3 is required for the local pre-push checks.
Install Python 3 or push with `--no-verify` if you need to bypass the hook intentionally.
EOF
  exit 1
fi

echo "Running local push checks..."

echo "1/3 Python syntax checks"
find .github/scripts -name '*.py' -exec python3 -m py_compile {} +

echo "2/3 Unit tests"
python3 -m unittest discover -s tests

echo "3/3 Image budget"
bash .github/scripts/check-image-budget.sh

echo "Local push checks passed."

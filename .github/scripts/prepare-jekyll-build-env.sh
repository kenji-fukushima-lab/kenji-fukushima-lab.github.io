#!/usr/bin/env bash
set -euo pipefail

if ! command -v convert >/dev/null 2>&1; then
  sudo apt-get update
  sudo apt-get install -y --no-install-recommends imagemagick
fi

python3 -m pip install --disable-pip-version-check -r requirements-build.txt

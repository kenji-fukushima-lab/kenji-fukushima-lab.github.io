#!/usr/bin/env bash
set -euo pipefail

bash "$(dirname "$0")/prepare-image-env.sh"

python3 -m pip install --disable-pip-version-check -r requirements-build.txt

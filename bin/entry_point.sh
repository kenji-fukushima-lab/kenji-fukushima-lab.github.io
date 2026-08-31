#!/usr/bin/env bash
set -euo pipefail

# Install missing locked gems into the persistent bundle volume. Never restore,
# delete, or silently regenerate the developer's lockfile.
export BUNDLE_FROZEN=true
bundle check || bundle install
exec python3 "$(dirname "$0")/serve.py"

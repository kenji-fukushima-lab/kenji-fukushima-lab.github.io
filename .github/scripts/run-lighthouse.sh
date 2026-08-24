#!/usr/bin/env bash
set -euo pipefail

repo_root=$(git rev-parse --show-toplevel)
cd "$repo_root"

rm -rf -- lighthouse-results-ci .lighthouseci
mkdir -p lighthouse-results-ci

server_log="lighthouse-results-ci/http-server.log"
python3 -m http.server 4000 --bind 127.0.0.1 --directory _site >"$server_log" 2>&1 &
server_pid=$!
cleanup() {
  kill "$server_pid" 2>/dev/null || true
  wait "$server_pid" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

for _attempt in $(seq 1 60); do
  if curl --fail --silent --output /dev/null http://127.0.0.1:4000/; then
    break
  fi
  sleep 0.25
done
curl --fail --silent --output /dev/null http://127.0.0.1:4000/

selected_paths=${LHCI_URL_PATHS:-$(node -e 'process.stdout.write(require("./.lighthouserc.cjs").ci.collect.url.map((url) => new URL(url).pathname).join(","))')}
number_of_runs=${LHCI_NUMBER_OF_RUNS:-3}

IFS=',' read -r -a paths <<<"$selected_paths"
for path in "${paths[@]}"; do
  [ -n "$path" ] || continue
  slug=$(printf '%s' "$path" | sed -E 's#^/|/$##g; s#[^[:alnum:]]+#-#g')
  [ -n "$slug" ] || slug=home
  for run in $(seq 1 "$number_of_runs"); do
    output_path="lighthouse-results-ci/${slug}-${run}.json"
    npx --no-install lighthouse "http://127.0.0.1:4000${path}" \
      --config-path=.github/lighthouse.config.cjs \
      --chrome-flags='--no-sandbox --headless=new' \
      --output=json \
      --output-path="$output_path" \
      --quiet
  done
done

node .github/scripts/validate-lighthouse-results.cjs lighthouse-results-ci

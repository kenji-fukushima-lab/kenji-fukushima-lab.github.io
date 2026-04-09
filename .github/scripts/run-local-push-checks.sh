#!/bin/sh
set -eu

repo_root=$(git rev-parse --show-toplevel)
cd "$repo_root"

for docker_dir in /usr/local/bin /Applications/Docker.app/Contents/Resources/bin; do
  if [ -x "$docker_dir/docker" ]; then
    PATH="$docker_dir:$PATH"
    export PATH
    break
  fi
done

run_paper_network_tests() {
  if command -v ruby >/dev/null 2>&1 && command -v bundle >/dev/null 2>&1; then
    if bundle check >/dev/null 2>&1; then
      bundle exec ruby -Itest test/paper_network_test.rb
      return
    fi
  fi

  if command -v docker >/dev/null 2>&1; then
    docker compose run --rm jekyll sh -lc 'bundle check || bundle install && bundle exec ruby -Itest test/paper_network_test.rb'
    return
  fi

  cat >&2 <<'EOF'
The Paper Network Ruby test requires one of the following:
- a local Ruby + Bundler environment with installed gems
- Docker with `docker compose`

Install the local Ruby dependencies or use Docker, then retry the push.
EOF
  exit 1
}

if ! command -v python3 >/dev/null 2>&1; then
  cat >&2 <<'EOF'
Python 3 is required for the local pre-push checks.
Install Python 3 or push with `--no-verify` if you need to bypass the hook intentionally.
EOF
  exit 1
fi

echo "Running local push checks..."

echo "1/4 Python syntax checks"
find .github/scripts -name '*.py' -exec python3 -m py_compile {} +

echo "2/4 Python unit tests"
python3 -m unittest discover -s tests

echo "3/4 Paper Network Ruby unit test"
run_paper_network_tests

echo "4/4 Image budget"
bash .github/scripts/check-image-budget.sh

echo "Local push checks passed."

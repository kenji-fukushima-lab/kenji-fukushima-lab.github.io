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

run_ruby_tests() {
  if command -v ruby >/dev/null 2>&1 && command -v bundle >/dev/null 2>&1; then
    if bundle check >/dev/null 2>&1; then
      bundle exec ruby -Itest test/run_all.rb
      return
    fi
  fi

  if command -v docker >/dev/null 2>&1; then
    docker compose run --rm jekyll sh -c 'bundle check || bundle install && bundle exec ruby -Itest test/run_all.rb'
    return
  fi

  cat >&2 <<'EOF'
The Ruby unit tests require one of the following:
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

if ! python3 -c 'from PIL import Image' >/dev/null 2>&1; then
  cat >&2 <<'EOF'
The Python unit tests require the dependencies in requirements-test.txt.
Install them with:

  python3 -m pip install -r requirements-test.txt
EOF
  exit 1
fi

echo "Running local push checks..."

echo "1/7 Python syntax checks"
find .github/scripts -name '*.py' -exec python3 -m py_compile {} +

echo "2/7 Python unit tests"
python3 -m unittest discover -s tests

echo "3/7 JavaScript unit tests"
npm run test:unit:js

echo "4/7 Ruby unit tests"
run_ruby_tests

echo "5/7 Bibliography validation"
python3 .github/scripts/validate_papers_bib.py _bibliography/papers.bib --skip-links

echo "6/7 Image budget"
bash .github/scripts/check-image-budget.sh

echo "7/7 Formatting"
npm run prettier

echo "Local push checks passed."

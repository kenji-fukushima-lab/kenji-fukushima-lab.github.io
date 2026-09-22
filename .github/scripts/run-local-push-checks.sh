#!/bin/sh
set -eu

repo_root=$(git rev-parse --show-toplevel)
cd "$repo_root"

# Git hooks export repository-local state; isolate temporary repositories in tests.
for git_env in $(git rev-parse --local-env-vars); do
  unset "$git_env"
done

docker_bin=$(command -v docker || true)
if [ -z "$docker_bin" ]; then
  for docker_dir in /usr/local/bin /Applications/Docker.app/Contents/Resources/bin; do
    if [ -x "$docker_dir/docker" ]; then
      docker_bin="$docker_dir/docker"
      break
    fi
  done
fi

run_ruby_tests() {
  if command -v ruby >/dev/null 2>&1 && command -v bundle >/dev/null 2>&1; then
    if command -v convert >/dev/null 2>&1 && command -v identify >/dev/null 2>&1 && bundle check >/dev/null 2>&1; then
      bundle exec ruby -Itest test/run_all.rb
      return
    fi
  fi

  if [ -n "$docker_bin" ]; then
    "$docker_bin" compose run --rm jekyll sh -c 'bundle check || bundle install && bundle exec ruby -Itest test/run_all.rb'
    return
  fi

  cat >&2 <<'EOF'
The Ruby unit tests require one of the following:
- a local Ruby + Bundler environment with installed gems and ImageMagick
- Docker with `docker compose`

Install the local Ruby dependencies or use Docker, then retry the push.
EOF
  exit 1
}

if ! command -v python3 >/dev/null 2>&1; then
  cat >&2 <<'EOF'
Python 3 is required for the local pre-push checks.
Install Python 3, then retry the checks.
EOF
  exit 1
fi

selected_checks=$(python3 .github/scripts/select_local_checks.py "$@")
if [ -z "$selected_checks" ]; then
  echo "No local checks selected."
  exit 0
fi

echo "Running local worktree checks: $selected_checks"
for check in $selected_checks; do
case "$check" in
syntax)
  python3 -m compileall -q .github/scripts
  python3 .github/scripts/publication_access_release.py
  ;;
python)
if ! python3 -c 'from PIL import Image' >/dev/null 2>&1; then
  cat >&2 <<'EOF'
The Python unit tests require the dependencies in requirements-test.txt.
Install them with:

  python3 -m pip install -r requirements-test.txt
EOF
  exit 1
fi
python3 -m unittest discover -s tests
  ;;
javascript)
npm run test:unit:js
  ;;
ruby)
run_ruby_tests
  ;;
bibliography)
python3 .github/scripts/validate_papers_bib.py _bibliography/papers.bib --skip-links
  ;;
images)
bash .github/scripts/check-image-budget.sh
  ;;
formatting)
npm run prettier
  ;;
*)
  echo "Unknown check: $check" >&2
  exit 1
  ;;
esac
done

echo "Selected local worktree checks passed. Remote CI validates the pushed commit."

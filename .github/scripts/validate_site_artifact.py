#!/usr/bin/env python3
"""Reject developer files in a deployable Jekyll artifact."""
import argparse
from pathlib import Path

FORBIDDEN = {
    'AGENTS.md', 'SYNC_HISTORY.md', 'README.md', 'INSTALL.md', 'CONTRIBUTING.md',
    'Dockerfile', 'Gemfile', 'Gemfile.lock', 'package.json', 'package-lock.json',
    'requirements.lock', 'requirements.txt', 'requirements-build.txt',
    'requirements-test.txt', 'requirements-audit.txt', 'playwright.config.js',
}
FORBIDDEN_DIRECTORIES = {
    '.git', '.github', '.agents', '.venv', 'node_modules', '__pycache__',
    'tests', 'test', 'test-results', 'playwright-report', 'tmp', 'automation',
}


def unexpected_files(root):
    return sorted(str(path.relative_to(root)) for path in root.rglob('*')
                  if path.is_file() and (path.name in FORBIDDEN or
                     set(path.relative_to(root).parts[:-1]) & FORBIDDEN_DIRECTORIES))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('site', type=Path)
    args = parser.parse_args()
    if not (args.site / 'index.html').is_file():
        parser.error('Site index.html is missing')
    unexpected = unexpected_files(args.site)
    if unexpected:
        parser.exit(1, 'Unexpected developer files in site artifact:\n' + '\n'.join(unexpected) + '\n')
    print('Public artifact file validation passed.')


if __name__ == '__main__':
    main()

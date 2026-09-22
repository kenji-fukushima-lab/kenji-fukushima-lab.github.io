#!/usr/bin/env python3
"""Stamp and verify the non-secret source digest of the existing Apps Script service."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import urllib.request

ROOT = Path(__file__).resolve().parents[2]
DIRECTORY = ROOT / 'automation/apps-script/publication-access-request'
PATTERN = re.compile(r'const SOURCE_REVISION = "[a-f0-9]+";')


def source_revision(source, manifest):
    normalized = PATTERN.sub('const SOURCE_REVISION = "";', source)
    return hashlib.sha256((normalized + '\n' + manifest).encode()).hexdigest()


def validate_status(status, expected):
    if not isinstance(status, dict) or status.get('service') != 'kflab-publication-access' or status.get('source_revision') != expected:
        raise ValueError('The existing Apps Script deployment does not match the reviewed source')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--stamp', action='store_true', help='Update the digest before deploying the reviewed source')
    parser.add_argument('--verify', action='store_true', help='Read status only; never submit the request form or send mail')
    args = parser.parse_args()
    path = DIRECTORY / 'Code.gs'
    source = path.read_text()
    if len(PATTERN.findall(source)) != 1:
        parser.error('Code.gs must declare exactly one SOURCE_REVISION digest')
    expected = source_revision(source, (DIRECTORY / 'appsscript.json').read_text())
    stamped = PATTERN.sub(f'const SOURCE_REVISION = "{expected}";', source)
    if args.stamp:
        path.write_text(stamped)
    elif stamped != source:
        parser.exit(1, 'Apps Script source digest is stale; run with --stamp before review/deployment.\n')
    if args.verify:
        config = (ROOT / '_data/publication_access.yml').read_text()
        url = re.search(r'^web_app_url:\s*(https://script.google.com/macros/s/[^\s]+/exec)\s*$', config, re.M).group(1)
        try:
            with urllib.request.urlopen(url + '?status=1', timeout=30) as response:
                status = json.load(response)
            validate_status(status, expected)
        except (ValueError, OSError) as error:
            parser.exit(1, f'Live Apps Script revision not verified: {error}\n')
        print(f'Existing deployment verified: {expected}')
    else:
        print(f'Apps Script source revision: {expected}')


if __name__ == '__main__':
    main()

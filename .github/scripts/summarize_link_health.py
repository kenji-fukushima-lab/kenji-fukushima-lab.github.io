#!/usr/bin/env python3
"""Deduplicate link failures without treating timeouts as missing pages."""
import argparse
from collections import Counter
from datetime import datetime, timezone
import json
from pathlib import Path
import re
from urllib.parse import urlsplit


def summarize(report, previous, now):
    failures = {}
    for kind, key in [('error', 'error_map'), ('timeout', 'timeout_map')]:
        for source, entries in report.get(key, {}).items():
            for entry in entries:
                url = entry['url']
                item = failures.setdefault(url, {'category': kind, 'sources': set(), 'statuses': set()})
                if kind == 'timeout':
                    item['category'] = 'timeout'
                item['sources'].add(source)
                status = entry.get('status', {})
                item['statuses'].add(status.get('text', 'Unknown error'))
                code = status.get('code')
                if kind != 'timeout' and (code or re.search(r'\b[45]\d\d\b', status.get('text', ''))):
                    item['category'] = 'http_error'
    history = {}
    for url, item in sorted(failures.items()):
        old = previous.get(url, {})
        history[url] = {**item, 'sources': sorted(item['sources']), 'statuses': sorted(item['statuses']),
                        'first_failed': old.get('first_failed', now), 'last_failed': now}
    # Keep only currently failing URLs. An absent URL may be fixed, removed, or excluded;
    # do not claim that it returned HTTP 200 (lychee can omit success details).
    return history


def markdown(history):
    counts = Counter(item['category'] for item in history.values())
    domains = Counter(urlsplit(url).netloc for url in history)
    lines = ['## External link diagnostics', '', f'{len(history)} unique failing URLs: ' +
             ', '.join(f'{kind}={count}' for kind, count in sorted(counts.items())), '',
             'Timeouts and cached errors do not establish that a page is missing.', '',
             '| Domain | Unique URLs |', '| --- | ---: |']
    lines += [f'| {host} | {count} |' for host, count in sorted(domains.items())]
    lines += ['', '| URL | Category | First observed failure (UTC) | Last observed failure (UTC) |', '| --- | --- | --- | --- |']
    for url, item in history.items():
        safe = url.replace('|', '%7C').replace('<', '%3C').replace('>', '%3E').replace('\n', '')
        lines.append(f"| <{safe}> | {item['category']} | {item['first_failed']} | {item['last_failed']} |")
    return '\n'.join(lines) + '\n'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('report', type=Path)
    parser.add_argument('--history', type=Path, default=Path('link-health-history.json'))
    parser.add_argument('--output', type=Path, default=Path('link-health-summary.md'))
    args = parser.parse_args()
    report = json.loads(args.report.read_text())
    previous = json.loads(args.history.read_text()) if args.history.exists() else {}
    now = datetime.now(timezone.utc).isoformat(timespec='seconds')
    history = summarize(report, previous, now)
    args.history.write_text(json.dumps(history, indent=2) + '\n')
    args.output.write_text(markdown(history))
    print(f'{len(history)} unique failing external URLs; diagnostic history updated')


if __name__ == '__main__':
    main()

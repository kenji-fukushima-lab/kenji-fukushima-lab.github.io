#!/usr/bin/env python3
"""Serve a finished site for browser checks without reusing a development server."""
import argparse
import os
import json
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--directory', default=os.environ.get('SITE_DIRECTORY', '_site'))
    parser.add_argument('--port', type=int, default=8081)
    parser.add_argument('--host', default='127.0.0.1')
    args = parser.parse_args()
    if not (Path(args.directory) / 'index.html').is_file():
        parser.error('Build the production site before running browser checks')
    try:
        metadata = json.loads((Path(args.directory) / 'build-info.json').read_text())
        if metadata.get('environment') != 'production':
            raise ValueError('not a production build')
    except (OSError, ValueError) as error:
        parser.error(f'Build production output before browser checks: {error}')
    # Concurrent browser bursts otherwise exceed the default socket backlog.
    ThreadingHTTPServer.request_queue_size = 128
    server = ThreadingHTTPServer((args.host, args.port), partial(SimpleHTTPRequestHandler, directory=args.directory))
    server.serve_forever()


if __name__ == '__main__':
    main()

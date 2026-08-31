#!/usr/bin/env python3
"""Run Jekyll and restart only its process group when site config changes."""

import os
from pathlib import Path
import signal
import subprocess
import time


def config_signature(path):
    try:
        stat = path.stat()
        return stat.st_ino, stat.st_mtime_ns, stat.st_size
    except FileNotFoundError:
        return None


def stop(process):
    if process.poll() is not None:
        return
    try:
        os.killpg(process.pid, signal.SIGTERM)
    except ProcessLookupError:
        # Jekyll may exit between poll() and signalling its process group.
        process.wait()
        return
    try:
        process.wait(timeout=10)
    except subprocess.TimeoutExpired:
        try:
            os.killpg(process.pid, signal.SIGKILL)
        except ProcessLookupError:
            pass
        process.wait()


def main():
    config = Path("_config.yml")
    command = [
        "bundle", "exec", "jekyll", "serve", "--watch", "--port=8080",
        "--host=0.0.0.0", "--livereload", "--trace", "--force_polling",
    ]
    stopping = False

    def request_stop(_signal, _frame):
        nonlocal stopping
        stopping = True

    signal.signal(signal.SIGINT, request_stop)
    signal.signal(signal.SIGTERM, request_stop)
    process = None
    try:
        while not stopping:
            signature = config_signature(config)
            process = subprocess.Popen(command, start_new_session=True)
            while not stopping and process.poll() is None:
                time.sleep(0.25)
                updated = config_signature(config)
                if updated is not None and updated != signature:
                    print("Site configuration changed; restarting Jekyll.", flush=True)
                    stop(process)
                    break
            else:
                return 0 if stopping else process.wait()
    finally:
        if process is not None:
            stop(process)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

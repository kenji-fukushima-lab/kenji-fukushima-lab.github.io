import json
from pathlib import Path
import socket
import subprocess
import sys
import tempfile
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / '.github/scripts/serve_site.py'


class ServeSiteTest(unittest.TestCase):
    def test_rejects_development_output_before_binding(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'index.html').write_text('development')
            (root / 'build-info.json').write_text(json.dumps({'environment': 'development'}))
            result = subprocess.run([sys.executable, str(SCRIPT), '--directory', directory, '--port', '0'], capture_output=True, text=True, timeout=5)
            self.assertNotEqual(0, result.returncode)
            self.assertIn('not a production build', result.stderr)

    def test_refuses_to_reuse_an_existing_server_port(self):
        with tempfile.TemporaryDirectory() as directory, socket.socket() as listener:
            root = Path(directory)
            (root / 'index.html').write_text('production')
            (root / 'build-info.json').write_text(json.dumps({'environment': 'production'}))
            listener.bind(('127.0.0.1', 0))
            listener.listen()
            port = listener.getsockname()[1]
            result = subprocess.run([sys.executable, str(SCRIPT), '--directory', directory, '--port', str(port)], capture_output=True, text=True, timeout=5)
            self.assertNotEqual(0, result.returncode)
            self.assertIn('Address already in use', result.stderr)

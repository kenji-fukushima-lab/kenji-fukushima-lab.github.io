import os
from pathlib import Path
import subprocess
import sys
import tempfile
import time
import unittest

ROOT = Path(__file__).resolve().parents[1]


def wait_for(predicate, timeout=5):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if predicate():
            return
        time.sleep(0.05)
    raise AssertionError("Development server did not reach the expected state")


class DevServerTest(unittest.TestCase):
    def test_startup_preserves_tracked_and_untracked_lockfiles(self):
        for tracked in (False, True):
            with self.subTest(tracked=tracked), tempfile.TemporaryDirectory() as directory:
                root = Path(directory)
                lock = root / "Gemfile.lock"
                lock.write_text("original locked dependencies\n")
                if tracked:
                    subprocess.run(["git", "init", "--quiet", directory], check=True)
                    subprocess.run(["git", "-C", directory, "add", "Gemfile.lock"], check=True)
                lock.write_text("developer's unfinished dependency update\n")
                commands = root / "commands"
                commands.mkdir()
                for name, text in (("bundle", '#!/bin/sh\n[ "$BUNDLE_FROZEN" = true ]\n'), ("python3", "#!/bin/sh\nexit 0\n")):
                    command = commands / name
                    command.write_text(text)
                    command.chmod(0o755)
                subprocess.run(["bash", str(ROOT / "bin/entry_point.sh")], cwd=root,
                               env={**os.environ, "PATH": f"{commands}{os.pathsep}{os.environ['PATH']}"}, check=True)
                self.assertEqual("developer's unfinished dependency update\n", lock.read_text())

    def test_atomic_config_replacement_restarts_only_the_managed_server(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "_config.yml").write_text("title: First\n")
            commands = root / "commands"
            commands.mkdir()
            bundle = commands / "bundle"
            bundle.write_text(f'#!{sys.executable}\nimport os,time\nwith open("started", "a") as log: log.write(str(os.getpid())+"\\n")\nwhile True: time.sleep(1)\n')
            bundle.chmod(0o755)
            env = {**os.environ, "PATH": f"{commands}{os.pathsep}{os.environ['PATH']}"}
            server = subprocess.Popen([sys.executable, str(ROOT / "bin/serve.py")], cwd=root, env=env, stdout=subprocess.DEVNULL)
            unrelated = subprocess.Popen([sys.executable, "-c", "import time; time.sleep(30)"])
            started = root / "started"
            try:
                wait_for(lambda: started.exists() and len(started.read_text().splitlines()) == 1)
                previous = int(started.read_text().strip())
                replacement = root / "new-config.yml"
                replacement.write_text("title: Second\n")
                replacement.replace(root / "_config.yml")
                wait_for(lambda: len(started.read_text().splitlines()) == 2)
                with self.assertRaises(ProcessLookupError):
                    os.kill(previous, 0)
                self.assertIsNone(unrelated.poll())
            finally:
                server.terminate()
                server.wait(timeout=15)
                unrelated.terminate()
                unrelated.wait(timeout=5)
            self.assertEqual(0, server.returncode)

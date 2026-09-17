import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).parents[1]


class GitHookIntegrationTest(unittest.TestCase):
    def test_pre_commit_preserves_partial_staging(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            subprocess.run(["git", "init", "-q"], cwd=root, check=True)
            document = root / "README.md"
            document.write_text("staged\n")
            subprocess.run(["git", "add", "README.md"], cwd=root, check=True)
            staged = subprocess.check_output(["git", "show", ":README.md"], cwd=root)
            document.write_text("unstaged\n")
            result = subprocess.run(["bash", str(ROOT / ".githooks/pre-commit")], cwd=root, capture_output=True)
            self.assertNotEqual(result.returncode, 0)
            self.assertEqual(document.read_text(), "unstaged\n")
            self.assertEqual(subprocess.check_output(["git", "show", ":README.md"], cwd=root), staged)

    def test_actual_pre_push_runs_only_formatting_for_committed_docs(self):
        with tempfile.TemporaryDirectory() as directory:
            temporary = Path(directory)
            root = temporary / "repo"
            root.mkdir()
            for name in [".githooks/pre-push", ".github/scripts/run-local-push-checks.sh", ".github/scripts/select_local_checks.py"]:
                target = root / name
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(ROOT / name, target)
            def git(*args):
                return subprocess.check_output(["git", *args], cwd=root, stderr=subprocess.PIPE).decode().strip()
            git("init", "-q")
            git("config", "user.name", "Fixture")
            git("config", "user.email", "fixture@example.test")
            (root / "README.md").write_text("before\n")
            git("add", ".")
            git("commit", "-qm", "base")
            base = git("rev-parse", "HEAD")
            (root / "README.md").write_text("after\n")
            git("commit", "-qam", "docs")
            head = git("rev-parse", "HEAD")
            toolbin = temporary / "bin"
            toolbin.mkdir()
            npm = toolbin / "npm"
            npm.write_text('#!/bin/sh\n[ -z "${GIT_DIR+x}${GIT_WORK_TREE+x}" ] || exit 97\nprintf "%s\\n" "$*" >> "$HOOK_LOG"\nexit "${HOOK_EXIT:-0}"\n')
            npm.chmod(0o755)
            logfile = temporary / "commands.log"
            env = {**os.environ, "PATH": str(toolbin) + os.pathsep + os.environ["PATH"], "HOOK_LOG": str(logfile), "GIT_DIR": str(root / ".git"), "GIT_WORK_TREE": str(root)}
            update = f"refs/heads/main {head} refs/heads/main {base}\n"
            result = subprocess.run(["sh", ".githooks/pre-push"], input=update, cwd=root, env=env, capture_output=True, text=True)
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual(logfile.read_text(), "run prettier\n")
            result = subprocess.run(["sh", ".githooks/pre-push"], input=update, cwd=root, env={**env, "HOOK_EXIT": "1"}, capture_output=True, text=True)
            self.assertEqual(result.returncode, 1)
            self.assertNotIn("checks passed", result.stdout)

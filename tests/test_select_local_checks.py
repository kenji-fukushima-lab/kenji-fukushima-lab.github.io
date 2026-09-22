import importlib.util
from pathlib import Path
import subprocess
import tempfile
import unittest

SCRIPT = Path(__file__).parents[1] / ".github/scripts/select_local_checks.py"
SPEC = importlib.util.spec_from_file_location("select_local_checks", SCRIPT)
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class LocalCheckSelectionTest(unittest.TestCase):
    def test_documentation_does_not_require_unrelated_runtimes(self):
        self.assertEqual(MODULE.select(["README.md", "docs/WORKFLOWS.md"]), ("formatting",))

    def test_unknown_runtime_dependency_and_fixture_changes_remain_full(self):
        for path in ["_pages/ja/a.md", "assets/js/main.js", "Gemfile.lock", "package.json", ".github/ci-paths.json", ".githooks/pre-push", "tests/fixtures/a.json", "../README.md"]:
            with self.subTest(path=path):
                self.assertEqual(MODULE.select(["README.md", path]), MODULE.ALL)

    def test_combines_language_test_lanes(self):
        self.assertEqual(MODULE.select(["tests/test_example.py", "tests/js/a.test.js"]), ("syntax", "python", "javascript", "formatting"))

    def test_real_git_range_and_dirty_fallback(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
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
            update = f"refs/heads/main {head} refs/heads/main {base}\n"
            self.assertEqual(MODULE.from_push(update, root)[0], ("formatting",))
            (root / "untracked.py").write_text("pass\n")
            self.assertEqual(MODULE.from_push(update, root)[0], MODULE.ALL)
            (root / "untracked.py").unlink()
            for other in ["0" * 40, "f" * 40]:
                self.assertEqual(MODULE.from_push(update.replace(base, other), root)[0], MODULE.ALL)
            self.assertEqual(MODULE.from_push(update.replace("refs/heads/main", "refs/tags/v1"), root)[0], MODULE.ALL)
            deletion = f"(delete) {'0' * 40} refs/heads/old {base}\n"
            self.assertEqual(MODULE.from_push(deletion, root)[0], ())
            self.assertEqual(MODULE.from_push(update + deletion, root)[0], ("formatting",))
            with self.assertRaises(subprocess.CalledProcessError):
                MODULE.changed_paths(root, "--stat", "HEAD")

    def test_invalid_push_input_is_rejected(self):
        with self.assertRaises(ValueError):
            MODULE.from_push("truncated input")

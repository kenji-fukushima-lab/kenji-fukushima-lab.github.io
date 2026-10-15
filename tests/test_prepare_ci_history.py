import importlib.util
from pathlib import Path
import subprocess
import tempfile
import unittest

SCRIPT = Path(__file__).parents[1] / ".github/scripts/prepare_ci_history.py"
SPEC = importlib.util.spec_from_file_location("prepare_ci_history", SCRIPT)
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class PrepareCiHistoryTest(unittest.TestCase):
    def git(self, root, *args):
        return subprocess.check_output(["git", "-C", str(root), *args], text=True, stderr=subprocess.DEVNULL).strip()

    def test_shallow_push_and_pull_request_diffs_match_full_history(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / "source"
            source.mkdir()
            self.git(source, "init", "-q")
            self.git(source, "config", "maintenance.auto", "false")
            self.git(source, "config", "gc.auto", "0")
            self.git(source, "config", "user.name", "Test")
            self.git(source, "config", "user.email", "test@example.invalid")
            for i in range(40):
                (source / "base.txt").write_text(str(i))
                self.git(source, "add", ".")
                self.git(source, "commit", "-qm", "base")
            common = self.git(source, "rev-parse", "HEAD")
            self.git(source, "checkout", "-qb", "feature")
            (source / "feature.txt").write_text("feature")
            self.git(source, "add", ".")
            self.git(source, "commit", "-qm", "feature")
            head = self.git(source, "rev-parse", "HEAD")
            self.git(source, "checkout", "-qb", "target", common)
            (source / "target.txt").write_text("target")
            self.git(source, "add", ".")
            self.git(source, "commit", "-qm", "target")
            base = self.git(source, "rev-parse", "HEAD")
            for event in ("push", "pull_request"):
                clone = root / event
                self.git(root, "clone", "-q", "--depth=1", "--branch=feature", source.as_uri(), str(clone))
                # Fetch can otherwise leave background maintenance writing into
                # this disposable repository while TemporaryDirectory removes it.
                self.git(clone, "config", "maintenance.auto", "false")
                self.git(clone, "config", "gc.auto", "0")
                MODULE.prepare_history(event, head=head, base=base, before=base, root=clone)
                revision = f"{base}...{head}" if event == "pull_request" else f"{base}..{head}"
                self.assertEqual(self.git(source, "diff", "--name-only", revision), self.git(clone, "diff", "--name-only", revision))
                self.assertEqual("true", self.git(clone, "rev-parse", "--is-shallow-repository"))

    def test_rejects_non_commit_arguments(self):
        with self.assertRaises(ValueError):
            MODULE.prepare_history("pull_request", head="--all", base="main")

    def test_schedules_and_new_branches_need_no_extra_history(self):
        MODULE.prepare_history("schedule", root=Path("/does-not-exist"))
        MODULE.prepare_history("push", before="0" * 40, root=Path("/does-not-exist"))


if __name__ == "__main__":
    unittest.main()

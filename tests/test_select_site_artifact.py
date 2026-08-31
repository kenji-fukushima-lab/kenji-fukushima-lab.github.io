import importlib.util
from pathlib import Path
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / ".github/scripts/select_site_artifact.py"
SPEC = importlib.util.spec_from_file_location("select_site_artifact", SCRIPT)
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class SiteArtifactTest(unittest.TestCase):
    def setUp(self):
        self.run = {"id": 42, "conclusion": "success", "event": "push", "head_branch": "main", "head_sha": "a" * 40, "head_repository": {"full_name": "lab/site"}}
        self.artifacts = [{"name": "production-site-" + "a" * 40, "expired": False}]

    def test_selects_only_the_matching_unexpired_commit(self):
        selected = MODULE.artifact_for_run(self.run, self.artifacts, "lab/site")
        self.assertEqual("42", selected["run_id"])
        self.assertEqual("a" * 40, selected["sha"])
        self.artifacts[0]["expired"] = True
        self.assertIsNone(MODULE.artifact_for_run(self.run, self.artifacts, "lab/site"))

    def test_rejects_pull_requests_forks_and_failed_builds(self):
        for key, value in (("event", "pull_request"), ("conclusion", "failure"), ("head_branch", "feature"), ("head_repository", {"full_name": "other/site"})):
            with self.subTest(key=key):
                self.assertIsNone(MODULE.artifact_for_run({**self.run, key: value}, self.artifacts, "lab/site"))

    def test_does_not_substitute_an_artifact_from_another_commit(self):
        self.run["head_sha"] = "b" * 40
        self.assertIsNone(MODULE.artifact_for_run(self.run, self.artifacts, "lab/site"))

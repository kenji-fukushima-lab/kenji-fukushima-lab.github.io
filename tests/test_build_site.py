import datetime as dt
import importlib.util
import json
import os
import pathlib
import subprocess
import sys
import tempfile
import unittest
from unittest import mock


SCRIPTS = pathlib.Path(__file__).parents[1] / ".github" / "scripts"
sys.path.insert(0, str(SCRIPTS))
SPEC = importlib.util.spec_from_file_location("build_site", SCRIPTS / "build_site.py")
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class BuildSiteTest(unittest.TestCase):
    def write_fixture(self, root, age=dt.timedelta()):
        data = root / "_data"
        data.mkdir()
        (data / "repositories.yml").write_text("github_repos:\n  - owner/one\n", encoding="utf-8")
        timestamp = (MODULE.utc_now() - age).isoformat()
        snapshot = {"repositories": {"owner/one": {"fetched_at": timestamp, "stargazers_count": 17}}}
        (data / "repo_stats.json").write_text(json.dumps(snapshot), encoding="utf-8")
        return data / "repo_stats.json"

    def test_fresh_snapshot_needs_no_credentials_or_network(self):
        with tempfile.TemporaryDirectory() as directory:
            root = pathlib.Path(directory)
            snapshot = self.write_fixture(root)
            with mock.patch.object(MODULE, "github_token") as token, mock.patch.object(MODULE, "refresh_repository_stats") as refresh:
                self.assertEqual(snapshot, MODULE.prepare_repo_stats(root))
                token.assert_not_called()
                refresh.assert_not_called()

    def test_cache_freshness_checks_each_repository_and_new_manifest_entries(self):
        with tempfile.TemporaryDirectory() as directory:
            root = pathlib.Path(directory)
            snapshot = self.write_fixture(root)
            self.assertFalse(MODULE.fresh_stats(snapshot, ["owner/one", "owner/new"]))
            for fetched_at in ("2000-01-01T00:00:00Z", "2099-01-01T00:00:00Z", "invalid", None):
                snapshot.write_text(json.dumps({"repositories": {"owner/one": {"fetched_at": fetched_at}}}), encoding="utf-8")
                self.assertFalse(MODULE.fresh_stats(snapshot, ["owner/one"]))

    def test_authenticated_refresh_is_shared_by_subsequent_builds_and_preserves_tracked_data(self):
        with tempfile.TemporaryDirectory() as directory:
            root = pathlib.Path(directory)
            tracked = self.write_fixture(root, age=dt.timedelta(days=2))
            original = tracked.read_bytes()
            broken_cache = root / ".jekyll-cache" / "local-repo-stats.json"
            broken_cache.parent.mkdir()
            broken_cache.write_text("{truncated", encoding="utf-8")
            tokens = []
            refresh_repository_stats = MODULE.refresh_repository_stats

            def fetch(repository, token):
                tokens.append((repository, token))
                return {"description": "Current", "stargazers_count": 23}

            def refresh(*args, **kwargs):
                return refresh_repository_stats(*args, **kwargs, fetcher=fetch)

            with (
                mock.patch.object(MODULE, "github_token", return_value="private-token") as token,
                mock.patch.object(MODULE, "refresh_repository_stats", side_effect=refresh),
            ):
                cached = MODULE.prepare_repo_stats(root)
                self.assertEqual(cached, MODULE.prepare_repo_stats(root))
                token.assert_called_once()
            self.assertEqual([("owner/one", "private-token")], tokens)
            self.assertEqual(broken_cache, cached)
            self.assertEqual(original, tracked.read_bytes())
            self.assertNotIn("private-token", cached.read_text())
            self.assertEqual(23, json.loads(cached.read_text())["repositories"]["owner/one"]["stargazers_count"])

    def test_github_cli_credentials_are_captured_and_missing_authentication_is_reported(self):
        with mock.patch.dict(os.environ, {}, clear=True):
            with mock.patch.object(MODULE.subprocess, "run", return_value=subprocess.CompletedProcess([], 0, "secret\n")) as run:
                self.assertEqual("secret", MODULE.github_token())
                self.assertTrue(run.call_args.kwargs["capture_output"])
            with mock.patch.object(MODULE.subprocess, "run", side_effect=FileNotFoundError):
                with self.assertRaisesRegex(RuntimeError, "gh auth login"):
                    MODULE.github_token()

    def test_failed_build_cleans_the_data_overlay_and_preserves_source(self):
        with tempfile.TemporaryDirectory() as directory:
            root = pathlib.Path(directory)
            tracked = self.write_fixture(root)
            original = tracked.read_bytes()
            cache = root / ".jekyll-cache"
            cache.mkdir()
            snapshot = cache / "local-repo-stats.json"
            snapshot.write_text('{"repositories": {"owner/one": {"stargazers_count": 29}}}', encoding="utf-8")

            def fail_jekyll(command, **kwargs):
                configuration = pathlib.Path(command[command.index("--config") + 1].split(",")[1])
                data_dir = root / json.loads(configuration.read_text())["data_dir"]
                self.assertEqual(snapshot.read_bytes(), (data_dir / "repo_stats.json").read_bytes())
                self.assertEqual(original, tracked.read_bytes())
                self.assertEqual("production", kwargs["env"]["JEKYLL_ENV"])
                raise subprocess.CalledProcessError(1, command)

            with (
                mock.patch.object(MODULE, "ROOT", root),
                mock.patch.object(MODULE, "prepare_repo_stats", return_value=snapshot),
                mock.patch.object(MODULE.subprocess, "run", side_effect=fail_jekyll),
            ):
                with self.assertRaises(subprocess.CalledProcessError):
                    MODULE.build(root / "_site")
            self.assertEqual(original, tracked.read_bytes())
            self.assertEqual([], list(cache.glob("local-build-*")))


if __name__ == "__main__":
    unittest.main()

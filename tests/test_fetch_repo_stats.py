import datetime as dt
import importlib.util
import json
import pathlib
import tempfile
import unittest


SCRIPT = pathlib.Path(__file__).parents[1] / ".github" / "scripts" / "fetch_repo_stats.py"
SPEC = importlib.util.spec_from_file_location("fetch_repo_stats", SCRIPT)
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class FetchRepoStatsTest(unittest.TestCase):
    def test_parse_repositories_reads_only_the_github_repos_section(self):
        with tempfile.TemporaryDirectory() as directory:
            path = pathlib.Path(directory) / "repositories.yml"
            path.write_text(
                "github_repos:\n  # - ignored/example\n  - owner/one\n  - owner/two # note\nnext_key: true\n  - ignored/after\n",
                encoding="utf-8",
            )

            self.assertEqual(["owner/one", "owner/two"], MODULE.parse_repositories(path))

    def test_refresh_normalizes_results_and_keeps_previous_values_on_failure(self):
        now = dt.datetime(2026, 8, 22, 12, 30, tzinfo=dt.timezone.utc)
        with tempfile.TemporaryDirectory() as directory:
            root = pathlib.Path(directory)
            repositories_path = root / "repositories.yml"
            output_path = root / "repo_stats.json"
            repositories_path.write_text("github_repos:\n  - owner/one\n  - owner/two\n", encoding="utf-8")
            output_path.write_text(
                json.dumps(
                    {
                        "generated_at": "2026-08-21T00:00:00Z",
                        "repositories": {
                            "owner/two": {
                                "description": "previous",
                                "fetched_at": "2026-08-21T00:00:00Z",
                                "forks_count": 2,
                                "open_issues_count": 3,
                                "pushed_at": "2026-08-20T00:00:00Z",
                                "stargazers_count": 4,
                            }
                        },
                    }
                ),
                encoding="utf-8",
            )

            def fetcher(repository, _token):
                if repository == "owner/two":
                    raise RuntimeError("temporary failure")
                return {
                    "description": "fresh",
                    "forks_count": 7,
                    "open_issues_count": 2,
                    "pushed_at": "2026-08-22T12:00:00Z",
                    "stargazers_count": 11,
                }

            output, failures = MODULE.refresh_repository_stats(
                repositories_path,
                output_path,
                token="token",
                fetcher=fetcher,
                now=now,
            )

            self.assertEqual("2026-08-22T12:30:00Z", output["generated_at"])
            self.assertEqual(11, output["repositories"]["owner/one"]["stargazers_count"])
            self.assertEqual("2026-08-22T12:30:00Z", output["repositories"]["owner/one"]["fetched_at"])
            self.assertEqual("previous", output["repositories"]["owner/two"]["description"])
            self.assertEqual(1, len(failures))
            self.assertEqual(output, json.loads(output_path.read_text(encoding="utf-8")))

    def test_refresh_fails_when_no_current_or_previous_value_exists(self):
        with tempfile.TemporaryDirectory() as directory:
            root = pathlib.Path(directory)
            repositories_path = root / "repositories.yml"
            output_path = root / "repo_stats.json"
            repositories_path.write_text("github_repos:\n  - owner/missing\n", encoding="utf-8")

            with self.assertRaisesRegex(RuntimeError, "No repository stats are available"):
                MODULE.refresh_repository_stats(
                    repositories_path,
                    output_path,
                    fetcher=lambda _repository, _token: (_ for _ in ()).throw(RuntimeError("offline")),
                )


if __name__ == "__main__":
    unittest.main()

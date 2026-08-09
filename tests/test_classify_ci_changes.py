import importlib.util
import pathlib
import unittest


SCRIPT = pathlib.Path(__file__).parents[1] / ".github" / "scripts" / "classify_ci_changes.py"
SPEC = importlib.util.spec_from_file_location("classify_ci_changes", SCRIPT)
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class ClassifyCiChangesTest(unittest.TestCase):
    def test_unit_test_only_change_skips_site_jobs(self):
        result = MODULE.classify(["tests/js/analytics-events.test.js"], "pull_request")

        self.assertEqual("false", result["build_required"])
        self.assertEqual("false", result["browser_required"])
        self.assertEqual("false", result["lighthouse_required"])

    def test_ui_test_change_builds_and_runs_browser_only(self):
        result = MODULE.classify(["tests/ui/resources.spec.js"], "pull_request")

        self.assertEqual("true", result["build_required"])
        self.assertEqual("true", result["browser_required"])
        self.assertEqual("false", result["lighthouse_required"])

    def test_japanese_post_targets_blog_on_pull_request(self):
        result = MODULE.classify(["_posts/ja/2026-08-09-example.md"], "pull_request")

        self.assertEqual("true", result["site_changed"])
        self.assertEqual("/ja/blog/", result["lighthouse_urls"])

    def test_global_asset_runs_every_lighthouse_url(self):
        result = MODULE.classify(["assets/css/main.scss"], "pull_request")

        self.assertEqual(",".join(MODULE.ALL_LIGHTHOUSE_URLS), result["lighthouse_urls"])

    def test_push_runs_every_lighthouse_url(self):
        result = MODULE.classify(["_pages/ja/resources.md"], "push")

        self.assertEqual(",".join(MODULE.ALL_LIGHTHOUSE_URLS), result["lighthouse_urls"])

    def test_markdown_change_requests_source_link_check(self):
        result = MODULE.classify(["README.md"], "pull_request")

        self.assertEqual("true", result["source_links_changed"])
        self.assertEqual("false", result["site_changed"])


if __name__ == "__main__":
    unittest.main()

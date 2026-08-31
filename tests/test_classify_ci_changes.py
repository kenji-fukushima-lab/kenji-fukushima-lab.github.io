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

    def test_localized_push_measures_the_changed_page(self):
        result = MODULE.classify(["_pages/ja/resources.md"], "push")

        self.assertEqual("/ja/resources/", result["lighthouse_urls"])

    def test_access_and_people_changes_measure_the_actual_page(self):
        for source, url in (("access.md", "/access/"), ("profiles.md", "/people/"), ("publications.md", "/publications/")):
            for lang, prefix in (("en-us", ""), ("ja", "/ja")):
                with self.subTest(source=source, lang=lang):
                    result = MODULE.classify([f"_pages/{lang}/{source}"], "pull_request")
                    self.assertIn(prefix + url, result["lighthouse_urls"].split(","))

    def test_profile_content_updates_both_people_pages(self):
        result = MODULE.classify(["_profiles/current_members/kenji.md"], "push")
        self.assertTrue({"/people/", "/ja/people/"}.issubset(result["lighthouse_urls"].split(",")))

    def test_root_public_files_build_and_publish_without_scoring_xml(self):
        for path in ("feed.xml", "robots.txt", "google77ff.html"):
            with self.subTest(path=path):
                result = MODULE.classify([path], "push")
                self.assertEqual("true", result["build_required"])
                self.assertEqual("true", result["site_changed"])
                self.assertEqual("false", result["lighthouse_required"])

    def test_apps_script_only_change_keeps_unit_checks(self):
        result = MODULE.classify(["automation/apps-script/publication-access-request/Code.gs"], "push")
        self.assertEqual("true", result["checks_required"])
        self.assertEqual("false", result["build_required"])

    def test_unknown_or_deleted_page_falls_back_to_full_coverage(self):
        result = MODULE.classify(["_pages/ja/deleted.md"], "push")
        self.assertEqual(",".join(MODULE.ALL_LIGHTHOUSE_URLS), result["lighthouse_urls"])

    def test_weekly_schedule_keeps_full_browser_coverage(self):
        result = MODULE.classify([], "schedule", full=True)
        self.assertEqual("true", result["browser_required"])
        self.assertEqual(",".join(MODULE.ALL_LIGHTHOUSE_URLS), result["lighthouse_urls"])

    def test_workflow_does_not_filter_out_paths_before_classification(self):
        workflow = (SCRIPT.parents[2] / ".github/workflows/deploy.yml").read_text()
        self.assertNotIn("    paths:", workflow)

    def test_scheduled_stats_refresh_skips_expensive_browser_jobs(self):
        result = MODULE.classify([], "schedule")

        self.assertEqual("true", result["site_changed"])
        self.assertEqual("true", result["build_required"])
        self.assertEqual("false", result["browser_required"])
        self.assertEqual("false", result["lighthouse_required"])

    def test_repo_stats_generator_change_rebuilds_the_site(self):
        result = MODULE.classify([".github/scripts/fetch_repo_stats.py"], "pull_request")

        self.assertEqual("true", result["site_changed"])
        self.assertEqual("true", result["build_required"])


if __name__ == "__main__":
    unittest.main()

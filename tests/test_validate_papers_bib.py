import importlib.util
import pathlib
import sys
import tempfile
import unittest
import urllib.error
from unittest import mock


SCRIPT = pathlib.Path(__file__).parents[1] / ".github" / "scripts" / "validate_papers_bib.py"
SPEC = importlib.util.spec_from_file_location("validate_papers_bib", SCRIPT)
MODULE = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = MODULE
SPEC.loader.exec_module(MODULE)


class Response:
    def __init__(self, status):
        self.status = status

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False


def http_error(code):
    return urllib.error.HTTPError("https://example.test", code, "temporary error", {}, None)


class RequestUrlTest(unittest.TestCase):
    def test_retries_temporary_get_failure_after_head_fallback(self):
        with (
            mock.patch.object(
                MODULE.urllib.request,
                "urlopen",
                side_effect=[http_error(502), http_error(502), Response(200)],
            ) as urlopen,
            mock.patch.object(MODULE.time, "sleep") as sleep,
        ):
            self.assertEqual((True, "200"), MODULE.request_url("https://example.test"))

        self.assertEqual(3, urlopen.call_count)
        sleep.assert_called_once_with(0.5)

    def test_reports_failure_after_retryable_status_is_exhausted(self):
        with (
            mock.patch.object(
                MODULE.urllib.request,
                "urlopen",
                side_effect=[http_error(503), http_error(503), http_error(503), http_error(503)],
            ) as urlopen,
            mock.patch.object(MODULE.time, "sleep") as sleep,
        ):
            self.assertEqual((False, "503"), MODULE.request_url("https://example.test"))

        self.assertEqual(4, urlopen.call_count)
        self.assertEqual([mock.call(0.5), mock.call(1.0)], sleep.call_args_list)

    def test_keeps_access_restricted_statuses_valid(self):
        with mock.patch.object(MODULE.urllib.request, "urlopen", side_effect=http_error(403)):
            self.assertEqual((True, "403"), MODULE.request_url("https://example.test"))


class BibSyntaxTest(unittest.TestCase):
    VALID = "@article{valid, article_type={research}, title={A title}, author={A. Author}, year={2026}, journal={Journal}}\n"

    def validate(self, text):
        with tempfile.TemporaryDirectory() as directory:
            path = pathlib.Path(directory) / "papers.bib"
            path.write_text(text)
            with mock.patch.object(MODULE.urllib.request, "urlopen", side_effect=AssertionError("Offline validation made a network call")):
                return MODULE.run_validation(path, skip_links=True)

    def test_rejects_broken_entry_after_a_valid_one(self):
        result = self.validate(self.VALID + "@article{broken, title={unfinished\n")
        self.assertEqual(1, len(result.errors))
        self.assertIn("line 2", result.errors[0])
        self.assertIn("unclosed", result.errors[0])

    def test_rejects_missing_opening_brace_and_field_separators(self):
        for suffix in ("@article broken", "@article{broken}", "@article{broken, title={A} author={B}}"):
            with self.subTest(suffix=suffix):
                self.assertTrue(self.validate(self.VALID + suffix).has_errors())

    def test_accepts_escaped_braces_and_nested_titles_offline(self):
        valid = self.VALID.replace("A title", r"A {nested} title with \{literal\}")
        self.assertFalse(self.validate(valid).has_errors())

    def test_link_export_includes_nonrendered_fields_and_doi(self):
        entry = MODULE.Entry("article", "test", {"doi": "10.1000/example", "correction": "https://example.test/correction"})
        self.assertEqual({"https://doi.org/10.1000/example", "https://example.test/correction"}, MODULE.collect_urls([entry])["test"])

    def test_transient_link_failures_are_distinguishable_from_404(self):
        entry = MODULE.Entry("article", "test", {"url": "https://example.test"})
        for detail, label in (("timeout", "temporarily unavailable"), ("404", "broken link")):
            with self.subTest(detail=detail), mock.patch.object(MODULE, "request_url", return_value=(False, detail)):
                self.assertIn(label, MODULE.validate_links([entry]).errors[0])


if __name__ == "__main__":
    unittest.main()

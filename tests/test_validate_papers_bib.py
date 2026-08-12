import importlib.util
import pathlib
import sys
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


if __name__ == "__main__":
    unittest.main()

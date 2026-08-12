import importlib.util
import pathlib
import sys
import unittest
import urllib.error
from unittest import mock


SCRIPT = pathlib.Path(__file__).parents[1] / ".github" / "scripts" / "verify_public_deployment.py"
SPEC = importlib.util.spec_from_file_location("verify_public_deployment", SCRIPT)
MODULE = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = MODULE
SPEC.loader.exec_module(MODULE)


EXPECTED_SHA = "a" * 40


class VerifyPublicDeploymentTest(unittest.TestCase):
    def test_builds_a_cache_busted_marker_url(self):
        url = MODULE.build_marker_url("https://example.test/site/", "/deployment-version.txt", EXPECTED_SHA, 3)

        self.assertEqual(
            f"https://example.test/site/deployment-version.txt?sha={EXPECTED_SHA}&attempt=3",
            url,
        )

    def test_waits_until_the_expected_marker_is_public(self):
        fetcher = mock.Mock(side_effect=["old", EXPECTED_SHA])
        sleeper = mock.Mock()

        MODULE.wait_for_deployment(
            base_url="https://example.test",
            marker_path="deployment-version.txt",
            expected_sha=EXPECTED_SHA,
            attempts=3,
            interval_seconds=0.25,
            fetcher=fetcher,
            sleeper=sleeper,
        )

        self.assertEqual(2, fetcher.call_count)
        sleeper.assert_called_once_with(0.25)
        self.assertIn("attempt=2", fetcher.call_args.args[0])

    def test_retries_transient_network_errors(self):
        fetcher = mock.Mock(side_effect=[urllib.error.URLError("temporary"), EXPECTED_SHA])

        MODULE.wait_for_deployment(
            base_url="https://example.test",
            marker_path="deployment-version.txt",
            expected_sha=EXPECTED_SHA,
            attempts=2,
            interval_seconds=0,
            fetcher=fetcher,
            sleeper=mock.Mock(),
        )

        self.assertEqual(2, fetcher.call_count)

    def test_fails_after_all_attempts_are_stale(self):
        sleeper = mock.Mock()

        with self.assertRaisesRegex(RuntimeError, EXPECTED_SHA):
            MODULE.wait_for_deployment(
                base_url="https://example.test",
                marker_path="deployment-version.txt",
                expected_sha=EXPECTED_SHA,
                attempts=2,
                interval_seconds=0.5,
                fetcher=mock.Mock(return_value="old"),
                sleeper=sleeper,
            )

        sleeper.assert_called_once_with(0.5)


if __name__ == "__main__":
    unittest.main()

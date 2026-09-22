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
    def test_retries_stale_markers_and_network_errors_with_cache_busted_urls(self):
        fetcher = mock.Mock(side_effect=["old", urllib.error.URLError("temporary"), EXPECTED_SHA])
        sleeper = mock.Mock()

        MODULE.wait_for_deployment(
            base_url="https://example.test/site/",
            marker_path="/deployment-version.txt",
            expected_sha=EXPECTED_SHA,
            attempts=3,
            interval_seconds=0.25,
            fetcher=fetcher,
            sleeper=sleeper,
        )

        self.assertEqual(
            [f"https://example.test/site/deployment-version.txt?sha={EXPECTED_SHA}&attempt={attempt}" for attempt in (1, 2, 3)],
            [call.args[0] for call in fetcher.call_args_list],
        )
        self.assertEqual([mock.call(0.25), mock.call(0.25)], sleeper.call_args_list)

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

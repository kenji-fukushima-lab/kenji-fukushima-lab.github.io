import importlib.util
from pathlib import Path
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / '.github/scripts/summarize_link_health.py'
SPEC = importlib.util.spec_from_file_location('links', SCRIPT)
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class LinkSummaryTest(unittest.TestCase):
    def test_timeout_wins_over_duplicate_cached_errors_and_keeps_first_date(self):
        url = 'https://example.test/a'
        report = {'error_map': {'a.html': [{'url': url, 'status': {'text': 'Error (cached)'}}],
                                'b.html': [{'url': url, 'status': {'text': 'Error (cached)'}}]},
                  'timeout_map': {'a.html': [{'url': url, 'status': {'text': 'Timeout'}}]}}
        result = MODULE.summarize(report, {url: {'first_failed': 'first'}, 'removed': {}}, 'last')
        self.assertEqual([url], list(result))
        self.assertEqual('timeout', result[url]['category'])
        self.assertEqual('first', result[url]['first_failed'])
        self.assertEqual('last', result[url]['last_failed'])
        self.assertEqual(['a.html', 'b.html'], result[url]['sources'])
        self.assertIn('1 unique failing URLs', MODULE.markdown(result))

    def test_http_failures_are_distinct_from_unclassified_errors(self):
        report = {'error_map': {'a': [{'url': 'https://example.test/missing', 'status': {'text': '404 Not Found'}}]}}
        result = MODULE.summarize(report, {}, 'today')
        self.assertEqual('http_error', next(iter(result.values()))['category'])

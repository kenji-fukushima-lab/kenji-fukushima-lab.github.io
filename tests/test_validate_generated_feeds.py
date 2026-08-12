import importlib.util
import pathlib
import sys
import tempfile
import unittest


SCRIPT = pathlib.Path(__file__).parents[1] / ".github" / "scripts" / "validate_generated_feeds.py"
SPEC = importlib.util.spec_from_file_location("validate_generated_feeds", SCRIPT)
MODULE = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = MODULE
SPEC.loader.exec_module(MODULE)


VALID_FEED = b"""<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <link href="https://example.test/feed.xml" rel="self" type="application/atom+xml" />
  <entry>
    <title>New post</title>
    <link href="https://example.test/blog/new-post/" rel="alternate" type="text/html" />
  </entry>
</feed>
"""


class GeneratedFeedValidationTest(unittest.TestCase):
    def validate(self, content):
        with tempfile.TemporaryDirectory() as directory:
            path = pathlib.Path(directory) / "feed.xml"
            path.write_bytes(content)
            return MODULE.validate_feed(path)

    def test_accepts_a_well_formed_atom_feed(self):
        self.assertEqual([], self.validate(VALID_FEED))

    def test_rejects_the_unclosed_link_regression(self):
        malformed = VALID_FEED.replace(
            b'rel="self" type="application/atom+xml" />',
            b'rel="self" type="application/atom+xml">',
        )

        errors = self.validate(malformed)

        self.assertEqual(1, len(errors))
        self.assertIn("invalid XML", errors[0])

    def test_requires_one_alternate_link_per_entry(self):
        missing = VALID_FEED.replace(
            b'<link href="https://example.test/blog/new-post/" rel="alternate" type="text/html" />',
            b"",
        )

        errors = self.validate(missing)

        self.assertEqual(1, len(errors))
        self.assertIn("exactly one alternate link", errors[0])


if __name__ == "__main__":
    unittest.main()

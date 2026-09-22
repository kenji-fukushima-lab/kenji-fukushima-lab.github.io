import importlib.util
from pathlib import Path
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / '.github/scripts/publication_access_release.py'
SPEC = importlib.util.spec_from_file_location('release', SCRIPT)
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class PublicationAccessReleaseTest(unittest.TestCase):
    def test_digest_ignores_stamp_but_covers_code_and_manifest(self):
        first = MODULE.source_revision('const SOURCE_REVISION = "0";\ncode', '{}')
        self.assertEqual(first, MODULE.source_revision('const SOURCE_REVISION = "abc";\ncode', '{}'))
        self.assertNotEqual(first, MODULE.source_revision('const SOURCE_REVISION = "0";\nchanged', '{}'))
        self.assertNotEqual(first, MODULE.source_revision('const SOURCE_REVISION = "0";\ncode', '{"scope":1}'))

    def test_old_and_wrong_deployments_fail_verification(self):
        for status in [{}, {'service': 'kflab-publication-access', 'source_revision': 'old'}]:
            with self.assertRaises(ValueError):
                MODULE.validate_status(status, 'new')
        MODULE.validate_status({'service': 'kflab-publication-access', 'source_revision': 'new'}, 'new')

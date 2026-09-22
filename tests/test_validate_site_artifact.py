import importlib.util
from pathlib import Path
import tempfile
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / '.github/scripts/validate_site_artifact.py'
SPEC = importlib.util.spec_from_file_location('artifact', SCRIPT)
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class ArtifactTest(unittest.TestCase):
    def test_rejects_developer_files_in_every_language(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            for name in ['SYNC_HISTORY.md', 'ja/SYNC_HISTORY.md', 'test-results/log.txt', 'ja/test-results/log.txt', 'assets/data/example.json']:
                path = root / name
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text('example')
            self.assertEqual(['SYNC_HISTORY.md', 'ja/SYNC_HISTORY.md', 'ja/test-results/log.txt', 'test-results/log.txt'], MODULE.unexpected_files(root))

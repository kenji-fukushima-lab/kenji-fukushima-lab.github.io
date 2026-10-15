import os
from pathlib import Path
import subprocess
import tempfile
import unittest


SCRIPT = Path(__file__).resolve().parents[1] / ".github/scripts/check-image-budget.sh"


class ImageBudgetTest(unittest.TestCase):
    def run_check(self, root, threshold="10"):
        return subprocess.run(
            ["bash", str(SCRIPT), str(root)], capture_output=True, text=True,
            env={**os.environ, "MAX_IMAGE_BYTES": threshold},
        )

    def test_accepts_images_at_or_below_the_exact_byte_limit(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            for name, size in [("empty.png", 0), ("small.jpg", 9), ("exact.WEBP", 10)]:
                (root / name).write_bytes(b"x" * size)
            (root / "large.pdf").write_bytes(b"x" * 100)
            result = self.run_check(root)
            self.assertEqual(0, result.returncode, result.stderr)
            self.assertEqual("Image budget check passed (10 bytes max per image).\n", result.stdout)

    def test_reports_only_oversized_images_in_descending_size_order(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            nested = root / "nested directory"
            nested.mkdir()
            (nested / "one byte over.JPEG").write_bytes(b"x" * 11)
            (root / "larger.gif").write_bytes(b"x" * 2049)
            (root / "exact.png").write_bytes(b"x" * 10)
            result = self.run_check(root)
            self.assertEqual(1, result.returncode, result.stderr)
            self.assertEqual([
                "Image budget check failed. Files larger than 10 bytes:",
                f" - {root / 'larger.gif'} (3 KiB)",
                f" - {nested / 'one byte over.JPEG'} (1 KiB)",
            ], result.stdout.splitlines())

    def test_zero_budget_and_invalid_inputs(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "empty.png").touch()
            self.assertEqual(0, self.run_check(root, "0").returncode)
            (root / "nonempty.png").write_bytes(b"x")
            self.assertEqual(1, self.run_check(root, "0").returncode)
            self.assertIn("must be numeric", self.run_check(root, "invalid").stderr)
            self.assertIn("Directory not found", self.run_check(root / "missing").stderr)


if __name__ == "__main__":
    unittest.main()

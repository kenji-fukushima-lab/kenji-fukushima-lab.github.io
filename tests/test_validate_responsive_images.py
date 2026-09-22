import importlib.util
from pathlib import Path
import tempfile
import unittest

from PIL import Image

SCRIPT = Path(__file__).resolve().parents[1] / ".github/scripts/validate_responsive_images.py"
SPEC = importlib.util.spec_from_file_location("validate_responsive_images", SCRIPT)
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class ResponsiveImageValidationTest(unittest.TestCase):
    def site(self, root, html):
        Image.new("RGB", (200, 300)).save(root / "small.webp")
        page = root / "blog/index.html"
        page.parent.mkdir()
        page.write_text(html)

    def test_picture_thumbnail_and_preload_use_actual_dimensions(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.site(root, '<picture><source srcset="/small.webp 200w"></picture>'
                      '<img srcset="../small.webp?v=1 200w">'
                      '<link rel="preload" imagesrcset="/small.webp 200w">')
            self.assertEqual(([], 3), MODULE.validate_site(root))

    def test_reports_wrong_width_and_missing_derivative(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.site(root, '<img srcset="/small.webp 240w, /missing.webp 480w">')
            errors, checked = MODULE.validate_site(root)
            self.assertEqual(0, checked)
            self.assertEqual(2, len(errors))
            self.assertIn("declares 240w but generated width is 200px", errors[0])
            self.assertIn("missing.webp", errors[1])

    def test_checks_duplicate_widths_without_fetching_external_images(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.site(root, '<img srcset="/small.webp 200w, /small.webp 200w">'
                      '<img srcset="https://example.invalid/remote.webp 800w">')
            errors, checked = MODULE.validate_site(root)
            self.assertEqual(1, checked)
            self.assertEqual(1, len(errors))
            self.assertIn("duplicate width descriptor", errors[0])

    def test_widths_are_independent_for_each_attribute_and_tag(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.site(root, '<img srcset="/small.webp 200w" imagesrcset="/small.webp 200w">'
                      '<img srcset="/small.webp 200w">')
            self.assertEqual(([], 3), MODULE.validate_site(root))

    def test_failed_candidates_keep_widths_and_error_order(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.site(root, '<img srcset="/small.webp 240w, /small.webp 240w, /small.webp 200w"'
                      ' imagesrcset="/small.webp 0w, /small.webp 200w">')
            self.assertEqual(([
                "blog/index.html: /small.webp: declares 240w but generated width is 200px",
                "blog/index.html: /small.webp: invalid or duplicate width descriptor 240w",
                "blog/index.html: /small.webp: invalid or duplicate width descriptor 0w",
            ], 2), MODULE.validate_site(root))

    def test_skips_data_external_and_non_width_candidates(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.site(root, '<img srcset="data:image/png;base64,ignored 200w">'
                      '<img srcset="https://example.invalid/a.webp 200w, '
                      '//example.invalid/b.webp 200w, /small.webp 2x, '
                      '/small.webp, /small.webp 200w extra, /small.webp 200w">'
                      '<img srcset="" imagesrcset><img>')
            self.assertEqual(([], 1), MODULE.validate_site(root))

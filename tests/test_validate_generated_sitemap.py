import importlib.util
import tempfile
import unittest
from pathlib import Path


MODULE_PATH = Path(__file__).parents[1] / ".github" / "scripts" / "validate_generated_sitemap.py"
SPEC = importlib.util.spec_from_file_location("validate_generated_sitemap", MODULE_PATH)
assert SPEC and SPEC.loader
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


def sitemap(*urls: str) -> str:
    entries = "".join(f"<url><loc>{url}</loc></url>" for url in urls)
    return f'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{entries}</urlset>'


class ValidateGeneratedSitemapTest(unittest.TestCase):
    def test_rejects_paths_outside_generated_site(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            site_dir = root / "_site"
            site_dir.mkdir()
            (root / "outside.html").write_text("not deployed")
            (site_dir / "linked.html").symlink_to(root / "outside.html")
            for path in ("../outside.html", "%2e%2e/outside.html", "linked.html"):
                with self.subTest(path=path):
                    sitemap_path = site_dir / "sitemap.xml"
                    sitemap_path.write_text(sitemap(f"https://example.test/{path}"))
                    errors = MODULE.validate_sitemap(sitemap_path, site_dir, "https://example.test")
                    self.assertEqual(1, len(errors))
                    self.assertIn("escapes the generated site", errors[0])

    def test_accepts_encoded_local_paths(self):
        with tempfile.TemporaryDirectory() as directory:
            site_dir = Path(directory)
            (site_dir / "日本語").mkdir()
            (site_dir / "日本語" / "index.html").write_text("ok")
            sitemap_path = site_dir / "sitemap.xml"
            sitemap_path.write_text(sitemap("https://example.test/%E6%97%A5%E6%9C%AC%E8%AA%9E/"))
            self.assertEqual([], MODULE.validate_sitemap(sitemap_path, site_dir, "https://example.test"))

    def test_accepts_urls_with_matching_generated_files(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            site_dir = root / "_site"
            (site_dir / "research" / "1_project").mkdir(parents=True)
            (site_dir / "research" / "1_project" / "index.html").write_text("ok")
            sitemap_path = site_dir / "sitemap.xml"
            sitemap_path.write_text(sitemap("https://example.test/research/1_project/"))

            self.assertEqual([], MODULE.validate_sitemap(sitemap_path, site_dir, "https://example.test"))

    def test_rejects_missing_generated_files(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            site_dir = root / "_site"
            site_dir.mkdir()
            sitemap_path = site_dir / "sitemap.xml"
            sitemap_path.write_text(sitemap("https://example.test/projects/1_project/"))

            errors = MODULE.validate_sitemap(sitemap_path, site_dir, "https://example.test")

            self.assertEqual(1, len(errors))
            self.assertIn("generated file is missing", errors[0])

    def test_rejects_external_and_duplicate_urls(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            site_dir = root / "_site"
            site_dir.mkdir()
            sitemap_path = site_dir / "sitemap.xml"
            sitemap_path.write_text(
                sitemap(
                    "https://other.test/",
                    "https://other.test/",
                )
            )

            errors = MODULE.validate_sitemap(sitemap_path, site_dir, "https://example.test")

            self.assertEqual(2, len(errors))
            self.assertTrue(any("unexpected origin" in error for error in errors))
            self.assertTrue(any("duplicate URL" in error for error in errors))


if __name__ == "__main__":
    unittest.main()

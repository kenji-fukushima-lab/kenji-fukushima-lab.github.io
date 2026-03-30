import importlib.util
import io
import os
import pathlib
import tempfile
import unittest
from unittest import mock

from PIL import Image


REPO_ROOT = pathlib.Path(__file__).resolve().parents[1]
MODULE_PATH = REPO_ROOT / ".github" / "scripts" / "create_blog_post_from_issue.py"
SPEC = importlib.util.spec_from_file_location("create_blog_post_from_issue", MODULE_PATH)
MODULE = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(MODULE)


class CreateBlogPostFromIssueTests(unittest.TestCase):
    def test_build_issue_title_uses_post_title(self) -> None:
        self.assertEqual(
            MODULE.build_issue_title("春探し"),
            "Blog post submission: 春探し",
        )

    def test_build_markdown_uses_prettier_friendly_front_matter(self) -> None:
        markdown = MODULE.build_markdown(
            title="春探し",
            date_str="2026-03-12",
            author='<a href="https://github.com/YoshinoHashimoto">YoshinoHashimoto</a>',
            body_markdown="1行目\n\n{% include figure.liquid path=\"assets/img/posts/sample.jpg\" class=\"img-fluid rounded z-depth-1 mx-auto d-block\" width=\"450\" alt=\"Image\" %}\n\n",
        )

        self.assertIn('title: "春探し"', markdown)
        self.assertTrue(markdown.endswith('alt="Image" %}\n'))

    def test_build_markdown_preserves_markdown_meaningful_whitespace(self) -> None:
        markdown = MODULE.build_markdown(
            title="Whitespace",
            date_str="2026-03-12",
            author="author",
            body_markdown="\nline 1  \nline 2\n\n```text\na\n\n\nb\n```\n\n",
        )

        self.assertIn("line 1  \nline 2", markdown)
        self.assertIn("```text\na\n\n\nb\n```", markdown)

    def test_optimize_image_asset_keeps_budget(self) -> None:
        image = Image.frombytes("RGB", (1200, 1200), os.urandom(1200 * 1200 * 3))
        buffer = io.BytesIO()
        image.save(buffer, format="JPEG", quality=95)
        original_bytes = buffer.getvalue()
        self.assertGreater(len(original_bytes), MODULE.MAX_IMAGE_BYTES)

        optimized_bytes, optimized_extension = MODULE.optimize_image_asset(
            original_bytes,
            ".jpg",
            "https://example.com/test.jpg",
            [],
        )

        self.assertEqual(optimized_extension, ".jpg")
        self.assertLessEqual(len(optimized_bytes), MODULE.MAX_IMAGE_BYTES)

    def test_replace_attachment_images_converts_html_image_tags(self) -> None:
        buffer = io.BytesIO()
        Image.new("RGB", (16, 16), color=(12, 34, 56)).save(buffer, format="PNG")
        image_bytes = buffer.getvalue()
        html_image = (
            '<img width="1584" height="1193" alt="Image" '
            'src="https://github.com/user-attachments/assets/8695a3da-3d9f-44ee-9dfe-dd42dcc6b86b" />'
        )

        with tempfile.TemporaryDirectory() as tmpdir:
            original_images_root = MODULE.IMAGES_ROOT
            MODULE.IMAGES_ROOT = pathlib.Path(tmpdir)
            try:
                with mock.patch.object(MODULE, "download_attachment", return_value=(image_bytes, "image/png")):
                    replaced_markdown, replaced_files, warnings = MODULE.replace_attachment_images(
                        markdown=html_image,
                        date_str="2026-03-19",
                        slug="internship-report",
                        issue_number=17,
                    )
            finally:
                MODULE.IMAGES_ROOT = original_images_root

        expected_asset = "assets/img/posts/2026-03-19_internship-report_issue17_01.png"
        self.assertIn(f'path="{expected_asset}"', replaced_markdown)
        self.assertIn('width="450"', replaced_markdown)
        self.assertEqual(replaced_files, [f"/{expected_asset}"])
        self.assertEqual(warnings, [])


if __name__ == "__main__":
    unittest.main()

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

    def test_validate_plain_text_submission_value_rejects_markup(self) -> None:
        with self.assertRaisesRegex(MODULE.InputError, "must not include HTML markup"):
            MODULE.validate_plain_text_submission_value("Post title", "<script>alert(1)</script>")

        with self.assertRaisesRegex(MODULE.InputError, "must not include Liquid markup"):
            MODULE.validate_plain_text_submission_value("Post title", "{% include evil %}")

    def test_validate_generated_body_markdown_rejects_html_and_liquid(self) -> None:
        with self.assertRaisesRegex(MODULE.InputError, "must not contain raw HTML"):
            MODULE.validate_generated_body_markdown("<script>alert(1)</script>")

        with self.assertRaisesRegex(MODULE.InputError, "must not include Liquid markup"):
            MODULE.validate_generated_body_markdown("before {{ site.title }} after")

    def test_validate_generated_body_markdown_allows_generated_figure_include(self) -> None:
        markdown = '{% include figure.liquid path="assets/img/posts/sample.jpg" class="img-fluid rounded z-depth-1 mx-auto d-block" width="450" alt="Image" %}'
        MODULE.validate_generated_body_markdown(markdown)

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

    def test_build_figure_include_escapes_liquid_delimiters_in_alt_text(self) -> None:
        figure = MODULE.build_figure_include("assets/img/posts/sample.jpg", 'brace {% %} "quote"')
        self.assertIn("&#123;&#37;", figure)
        self.assertIn("&quot;quote&quot;", figure)

    def test_original_liquid_and_html_attributes_cannot_bypass_validation(self):
        for body in [
            '{% include figure.liquid path="assets/img/posts/sample.jpg" caption="<script>alert(1)</script>" %}',
            '<img src="https://github.com/user-attachments/assets/abc" onerror="alert(1)">',
            '[click](java&#115;cript:alert%281%29)',
            '[click](javascript%3Aalert%281%29)',
        ]:
            with self.subTest(body=body), tempfile.TemporaryDirectory() as tmp:
                with mock.patch.object(MODULE, "IMAGES_ROOT", pathlib.Path(tmp)), mock.patch.object(MODULE, "download_attachment") as download:
                    with self.assertRaises(MODULE.InputError):
                        MODULE.replace_attachment_images(body, "2026-09-22", "audit", 1)
                    download.assert_not_called()

    def test_generated_include_allowlist_rejects_extra_attributes(self):
        for attribute in ['caption="<script>alert(1)</script>"', 'alt=\'" onerror="alert(1)\'']:
            with self.subTest(attribute=attribute), self.assertRaises(MODULE.InputError):
                MODULE.validate_generated_body_markdown('{% include figure.liquid path="assets/img/posts/a.jpg" ' + attribute + ' %}')

    def test_download_is_bounded_even_without_content_length(self):
        response = mock.MagicMock()
        response.__enter__.return_value = response
        response.read.side_effect = [b'x' * 8, b'x' * 3]
        with mock.patch.object(MODULE, "MAX_DOWNLOAD_BYTES", 10), mock.patch.object(MODULE.urllib.request, "urlopen", return_value=response):
            with self.assertRaisesRegex(MODULE.InputError, "download limit"):
                MODULE.download_attachment('https://github.com/user-attachments/assets/example')

    def test_rejects_invalid_svg_and_excessive_pixels(self):
        for data, extension in [(b'<svg/>', '.svg'), (b'<html/>', '.png')]:
            with self.subTest(extension=extension), self.assertRaises(MODULE.InputError):
                MODULE.optimize_image_asset(data, extension, 'test', [])
        buffer = io.BytesIO()
        Image.new('RGB', (20, 20)).save(buffer, format='PNG')
        with mock.patch.object(MODULE, 'MAX_IMAGE_PIXELS', 100):
            with self.assertRaisesRegex(MODULE.InputError, 'pixels'):
                MODULE.optimize_image_asset(buffer.getvalue(), '.png', 'test', [])

    def test_attachment_count_and_combined_bytes_are_bounded(self):
        buffer = io.BytesIO()
        Image.new('RGB', (16, 16)).save(buffer, format='PNG')
        data = buffer.getvalue()
        body = '\n'.join(f'![Image](https://github.com/user-attachments/assets/{i})' for i in range(2))
        for setting, limit in [('MAX_ATTACHMENTS', 1), ('MAX_ATTACHMENT_BYTES', len(data))]:
            with self.subTest(setting=setting), tempfile.TemporaryDirectory() as tmp:
                with mock.patch.object(MODULE, 'IMAGES_ROOT', pathlib.Path(tmp)), mock.patch.object(MODULE, setting, limit), mock.patch.object(MODULE, 'download_attachment', return_value=(data, 'image/png')):
                    with self.assertRaises(MODULE.InputError):
                        MODULE.replace_attachment_images(body, '2026-09-22', 'audit', 1)


if __name__ == "__main__":
    unittest.main()

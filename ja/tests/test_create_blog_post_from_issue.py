import importlib.util
import io
import os
import pathlib
import unittest

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


if __name__ == "__main__":
    unittest.main()

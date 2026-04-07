import importlib.util
import io
import pathlib
import tempfile
import textwrap
import unittest
from unittest import mock

from PIL import Image


REPO_ROOT = pathlib.Path(__file__).resolve().parents[1]
MODULE_PATH = REPO_ROOT / ".github" / "scripts" / "create_profile_update_from_issue.py"
SPEC = importlib.util.spec_from_file_location("create_profile_update_from_issue", MODULE_PATH)
MODULE = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(MODULE)


class CreateProfileUpdateFromIssueTests(unittest.TestCase):
    def test_split_value_and_comment_keeps_url_fragments_and_quoted_hashes(self) -> None:
        value, comment = MODULE.split_value_and_comment(' https://example.com/#fragment')
        self.assertEqual(value, "https://example.com/#fragment")
        self.assertEqual(comment, "")

        value, comment = MODULE.split_value_and_comment(' "foo # bar" # trailing comment')
        self.assertEqual(value, '"foo # bar"')
        self.assertEqual(comment, " # trailing comment")

    def test_normalize_service_url_accepts_supported_ids(self) -> None:
        self.assertEqual(
            MODULE.normalize_service_url("orcid", "0000-0002-2353-9274"),
            "https://orcid.org/0000-0002-2353-9274",
        )
        self.assertEqual(
            MODULE.normalize_service_url("twitter", "@ninui23"),
            "https://x.com/ninui23",
        )
        self.assertEqual(
            MODULE.normalize_service_url("researchgate", "Naoto-Inui"),
            "https://www.researchgate.net/profile/Naoto-Inui",
        )
        self.assertEqual(
            MODULE.normalize_service_url("researchmap", "n_inui"),
            "https://researchmap.jp/n_inui",
        )

    def test_normalize_field_value_blocks_github_hijack_for_self_service(self) -> None:
        with self.assertRaisesRegex(MODULE.InputError, "must stay matched"):
            MODULE.normalize_field_value(
                "github",
                "someone-else",
                issue_user_login="ninui23",
                allow_arbitrary_github_change=False,
            )

    def test_resolve_profile_path_finds_matching_profile_by_github_username(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            repo_root = pathlib.Path(tmpdir)
            profiles_root = repo_root / "_profiles"
            current_members_root = profiles_root / "current_members"
            current_members_root.mkdir(parents=True)
            (current_members_root / "naoto_inui.md").write_text(
                textwrap.dedent(
                    """\
                    ---
                    name: Naoto Inui
                    github: ninui23
                    ---
                    """
                ),
                encoding="utf-8",
            )

            with mock.patch.object(MODULE, "REPO_ROOT", repo_root), mock.patch.object(MODULE, "PROFILES_ROOT", profiles_root):
                resolved = MODULE.resolve_profile_path("ninui23", {})

        self.assertEqual(resolved.name, "naoto_inui.md")

    def test_resolve_profile_override_rejects_ambiguous_stem(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            repo_root = pathlib.Path(tmpdir)
            profiles_root = repo_root / "_profiles"
            alumni_root = repo_root / "_profiles" / "alumni"
            current_root = repo_root / "_profiles" / "current_members"
            alumni_root.mkdir(parents=True)
            current_root.mkdir(parents=True, exist_ok=True)
            first = current_root / "member.md"
            second = alumni_root / "member.md"
            first.write_text("---\nname: First\ngithub: first-user\n---\n", encoding="utf-8")
            second.write_text("---\nname: Second\ngithub: second-user\n---\n", encoding="utf-8")

            with mock.patch.object(MODULE, "REPO_ROOT", repo_root), mock.patch.object(MODULE, "PROFILES_ROOT", profiles_root):
                with self.assertRaisesRegex(MODULE.InputError, "matched multiple files"):
                    MODULE.resolve_profile_override("member", [first, second])

    def test_extract_profile_photo_source_rejects_multiple_attachments(self) -> None:
        sections = {
            "プロフィール写真 / Profile Photo (drag and drop one image, optional)": textwrap.dedent(
                """\
                ![one](https://github.com/user-attachments/assets/one)
                ![two](https://github.com/user-attachments/assets/two)
                """
            )
        }

        with self.assertRaisesRegex(MODULE.InputError, "Attach exactly one profile photo"):
            MODULE.extract_profile_photo_source(sections)

    def test_save_profile_photo_attachment_rejects_non_image_attachment(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            repo_root = pathlib.Path(tmpdir)
            images_root = repo_root / "assets" / "img" / "people"
            images_root.mkdir(parents=True)
            profile_path = repo_root / "_profiles" / "current_members" / "naoto_inui.md"
            profile_path.parent.mkdir(parents=True)
            profile_path.write_text("---\nimage: people/naoto_inui.jpg\n---\n", encoding="utf-8")

            with (
                mock.patch.object(MODULE, "REPO_ROOT", repo_root),
                mock.patch.object(MODULE, "PROFILE_IMAGES_ROOT", images_root),
                mock.patch.object(
                    MODULE.blog_post_automation,
                    "download_attachment",
                    return_value=(b"\x00\x00\x00\x18ftypmp42" + b"0" * 32, "video/mp4"),
                ),
            ):
                with self.assertRaisesRegex(MODULE.InputError, "supported raster image attachment"):
                    MODULE.save_profile_photo_attachment(
                        profile_path,
                        {"image": "people/naoto_inui.jpg"},
                        "https://github.com/user-attachments/assets/profile-video",
                    )

    def test_save_profile_photo_attachment_converts_webp_output_to_supported_format(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            repo_root = pathlib.Path(tmpdir)
            images_root = repo_root / "assets" / "img" / "people"
            images_root.mkdir(parents=True)
            profile_path = repo_root / "_profiles" / "current_members" / "naoto_inui.md"
            profile_path.parent.mkdir(parents=True)
            profile_path.write_text("---\nimage: people/naoto_inui.jpg\n---\n", encoding="utf-8")

            buffer = io.BytesIO()
            Image.new("RGBA", (16, 16), color=(12, 34, 56, 128)).save(buffer, format="PNG")
            pseudo_webp_bytes = buffer.getvalue()

            with (
                mock.patch.object(MODULE, "REPO_ROOT", repo_root),
                mock.patch.object(MODULE, "PROFILE_IMAGES_ROOT", images_root),
                mock.patch.object(
                    MODULE.blog_post_automation,
                    "download_attachment",
                    return_value=(pseudo_webp_bytes, "image/webp"),
                ),
                mock.patch.object(
                    MODULE.blog_post_automation,
                    "optimize_image_asset",
                    return_value=(pseudo_webp_bytes, ".webp"),
                ),
            ):
                relative_asset_path, profile_image_value, warnings, file_changed = MODULE.save_profile_photo_attachment(
                    profile_path,
                    {"image": "people/naoto_inui.jpg"},
                    "https://github.com/user-attachments/assets/profile-photo",
                )

            self.assertEqual(relative_asset_path, "assets/img/people/naoto_inui.png")
            self.assertEqual(profile_image_value, "people/naoto_inui.png")
            self.assertTrue(any("Converted unsupported profile photo format .webp to .png" in warning for warning in warnings))
            self.assertTrue(file_changed)
            self.assertTrue((images_root / "naoto_inui.png").exists())

    def test_main_accepts_photo_only_update_and_outputs_add_paths(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            repo_root = pathlib.Path(tmpdir)
            profiles_root = repo_root / "_profiles"
            current_members_root = profiles_root / "current_members"
            images_root = repo_root / "assets" / "img" / "people"
            current_members_root.mkdir(parents=True)
            images_root.mkdir(parents=True)

            profile_path = current_members_root / "naoto_inui.md"
            profile_path.write_text(
                textwrap.dedent(
                    """\
                    ---
                    name: Naoto Inui
                    github: ninui23
                    image: people/naoto_inui.jpg
                    ---
                    """
                ),
                encoding="utf-8",
            )

            buffer = io.BytesIO()
            Image.new("RGB", (16, 16), color=(12, 34, 56)).save(buffer, format="PNG")
            output_path = repo_root / "github_output.txt"
            issue = {
                "number": 17,
                "html_url": "https://github.com/example/repo/issues/17",
                "user": {"login": "ninui23"},
                "body": textwrap.dedent(
                    """\
                    ### プロフィール写真 / Profile Photo (drag and drop one image, optional)
                    ![Profile photo](https://github.com/user-attachments/assets/profile-photo)
                    """
                ),
            }

            with (
                mock.patch.object(MODULE, "REPO_ROOT", repo_root),
                mock.patch.object(MODULE, "PROFILES_ROOT", profiles_root),
                mock.patch.object(MODULE, "PROFILE_IMAGES_ROOT", images_root),
                mock.patch.object(MODULE, "load_issue_from_event", return_value=issue),
                mock.patch.object(
                    MODULE.blog_post_automation,
                    "download_attachment",
                    return_value=(buffer.getvalue(), "image/png"),
                ),
                mock.patch.dict("os.environ", {"GITHUB_OUTPUT": str(output_path)}, clear=False),
            ):
                result = MODULE.main()

            self.assertEqual(result, 0)
            self.assertIn("image: people/naoto_inui.png", profile_path.read_text(encoding="utf-8"))
            self.assertTrue((images_root / "naoto_inui.png").exists())

            output_text = output_path.read_text(encoding="utf-8")
            self.assertIn("add_paths<<__EOF__", output_text)
            self.assertIn("_profiles/current_members/naoto_inui.md", output_text)
            self.assertIn("assets/img/people/naoto_inui.png", output_text)


if __name__ == "__main__":
    unittest.main()

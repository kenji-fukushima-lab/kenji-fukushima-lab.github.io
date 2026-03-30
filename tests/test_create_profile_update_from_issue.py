import importlib.util
import pathlib
import tempfile
import textwrap
import unittest
from unittest import mock


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
            profiles_root.mkdir(parents=True)
            (profiles_root / "naoto_inui.md").write_text(
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
            alumni_root = repo_root / "_profiles" / "alumni"
            current_root = repo_root / "_profiles"
            alumni_root.mkdir(parents=True)
            current_root.mkdir(parents=True, exist_ok=True)
            first = current_root / "member.md"
            second = alumni_root / "member.md"
            first.write_text("---\nname: First\ngithub: first-user\n---\n", encoding="utf-8")
            second.write_text("---\nname: Second\ngithub: second-user\n---\n", encoding="utf-8")

            with mock.patch.object(MODULE, "REPO_ROOT", repo_root), mock.patch.object(MODULE, "PROFILES_ROOT", current_root):
                with self.assertRaisesRegex(MODULE.InputError, "matched multiple files"):
                    MODULE.resolve_profile_override("member", [first, second])


if __name__ == "__main__":
    unittest.main()

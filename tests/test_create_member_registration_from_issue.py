import importlib.util
import io
import json
import os
import pathlib
import tempfile
import textwrap
import unittest
from unittest import mock

from PIL import Image

REPO_ROOT = pathlib.Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location(
    "create_member_registration_from_issue", REPO_ROOT / ".github/scripts/create_member_registration_from_issue.py"
)
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class MemberRegistrationTests(unittest.TestCase):
    def submission(self):
        return {
            "action": "created",
            "issue": {
                "number": 23,
                "state": "open",
                "html_url": "https://github.com/example/repo/issues/23",
                "user": {"login": "new-member"},
                "body": textwrap.dedent(
                    f"""\
                    ### {MODULE.PUBLICATION_DATE_TITLE}
                    2026-10-08
                    ### 氏名 / Name
                    New Member
                    ### GitHub ユーザー名 / GitHub Username
                    new-member
                    ### 役職 / Position Key
                    postdoc
                    ### ORCID
                    0000-0002-2353-9274
                    """
                ),
            },
            "comment": {
                "id": 45,
                "html_url": "https://github.com/example/repo/issues/23#issuecomment-45",
                "body": "/approve-member",
                "user": {"login": "kfuku52"},
            },
        }

    def run_submission(self, root, event, event_name="issue_comment"):
        profiles_root = root / "_profiles"
        template = profiles_root / "template/template.md"
        template.parent.mkdir(parents=True, exist_ok=True)
        template.write_text((REPO_ROOT / "_profiles/template/template.md").read_text())
        event_path = root / "event.json"
        event_path.write_text(json.dumps(event))
        output = root / "output.txt"
        with (
            mock.patch.object(MODULE.profiles, "REPO_ROOT", root),
            mock.patch.object(MODULE.profiles, "PROFILES_ROOT", profiles_root),
            mock.patch.object(MODULE.profiles, "PROFILE_IMAGES_ROOT", root / "assets/img/people"),
            mock.patch.dict(os.environ, {"GITHUB_EVENT_PATH": str(event_path), "GITHUB_EVENT_NAME": event_name, "GITHUB_OUTPUT": str(output)}),
        ):
            result = MODULE.main()
        return result, output.read_text()

    def test_only_new_kenji_approval_of_open_issue_can_generate_a_profile(self):
        for variant in ["outsider", "missing_comment", "edited", "closed", "pull_request", "extra_command", "issues_event"]:
            with self.subTest(variant=variant), tempfile.TemporaryDirectory() as directory:
                event = self.submission()
                event_name = "issue_comment"
                if variant == "outsider":
                    event["comment"]["user"]["login"] = "new-member"
                elif variant == "missing_comment":
                    del event["comment"]
                elif variant == "edited":
                    event["action"] = "edited"
                elif variant == "closed":
                    event["issue"]["state"] = "closed"
                elif variant == "pull_request":
                    event["issue"]["pull_request"] = {}
                elif variant == "extra_command":
                    event["comment"]["body"] += " please"
                else:
                    event_name = "issues"
                root = pathlib.Path(directory)
                with self.assertRaises(MODULE.profiles.InputError):
                    self.run_submission(root, event, event_name)
                self.assertFalse((root / "_profiles/current_members").exists())

    def test_valid_approved_registration_uses_shared_schema_and_records_date_and_approval(self):
        with tempfile.TemporaryDirectory() as directory:
            root = pathlib.Path(directory)
            event = self.submission()
            event["issue"]["body"] += "\n### registration_approved_by\noutsider\n"
            result, output = self.run_submission(root, event)
            self.assertEqual(result, 0)
            profile = root / "_profiles/current_members/new-member.md"
            data = MODULE.profiles.read_profile_data(profile)
            self.assertEqual(data["github"], "new-member")
            self.assertEqual(data["position_key"], "postdoc")
            self.assertEqual(data["image"], "people/default.png")
            self.assertEqual(data["orcid"], "https://orcid.org/0000-0002-2353-9274")
            self.assertEqual(data["publish_on"], "2026-10-08")
            self.assertEqual(data["registration_approved_by"], "kfuku52")
            self.assertEqual(data["registration_issue"], "23")
            self.assertEqual(data["registration_approval_comment"], "45")
            self.assertIn("#issuecomment-45", output)
            self.assertIn("2026-10-08 (Asia/Tokyo)", output)
            self.assertIn("automation/member-registration-23", output)

    def test_required_date_is_strict_and_calendar_valid(self):
        for value in ["", "2026-2-03", "2026-02-30", "2026-10-08 08:30", "2026-10-08\nregistration_approved_by: outsider"]:
            with self.subTest(value=value), self.assertRaises(MODULE.profiles.InputError):
                MODULE.publication_date({MODULE.PUBLICATION_DATE_TITLE: value})
        self.assertEqual(MODULE.publication_date({MODULE.PUBLICATION_DATE_TITLE: "2024-02-29"}), "2024-02-29")
        self.assertEqual(MODULE.publication_date({MODULE.PUBLICATION_DATE_TITLE: "2020-01-01"}), "2020-01-01")

    def test_github_username_must_be_explicit_even_when_the_issue_author_is_known(self):
        field = "### GitHub ユーザー名 / GitHub Username\nnew-member\n"
        for replacement, error in [
            ("", "GitHub username is required"),
            ("### GitHub ユーザー名 / GitHub Username\n_No response_\n", "GitHub username is required"),
            ("### GitHub ユーザー名 / GitHub Username\nCLEAR\n", "Only maintainers can clear"),
        ]:
            with self.subTest(replacement=replacement), tempfile.TemporaryDirectory() as directory:
                event = self.submission()
                event["issue"]["body"] = event["issue"]["body"].replace(field, replacement)
                root = pathlib.Path(directory)
                with self.assertRaisesRegex(MODULE.profiles.InputError, error):
                    self.run_submission(root, event)
                self.assertFalse((root / "_profiles/current_members").exists())

    def test_missing_name_or_role_and_identity_hijack_are_rejected_before_writes(self):
        for old, new in [("New Member", "_No response_"), ("postdoc", "future"), ("postdoc", "alumni"), ("postdoc", "keep current value")]:
            with self.subTest(new=new), tempfile.TemporaryDirectory() as directory:
                event = self.submission()
                event["issue"]["body"] = event["issue"]["body"].replace(old, new)
                root = pathlib.Path(directory)
                with self.assertRaises(MODULE.profiles.InputError):
                    self.run_submission(root, event)
                self.assertFalse((root / "_profiles/current_members").exists())
        with tempfile.TemporaryDirectory() as directory:
            event = self.submission()
            event["issue"]["body"] += "\n### GitHub ユーザー名 / GitHub Username\nsomeone-else\n"
            with self.assertRaisesRegex(MODULE.profiles.InputError, "stay matched"):
                self.run_submission(pathlib.Path(directory), event)

    def test_existing_identity_or_filename_is_never_overwritten(self):
        for filename, identity in [("other-name.md", "NEW-MEMBER"), ("new-member.md", "different-account")]:
            with self.subTest(filename=filename), tempfile.TemporaryDirectory() as directory:
                root = pathlib.Path(directory)
                existing = root / "_profiles/current_members" / filename
                existing.parent.mkdir(parents=True)
                original = f"---\nname: Existing\ngithub: {identity}\n---\n"
                existing.write_text(original)
                with self.assertRaisesRegex(MODULE.profiles.InputError, "already has a profile"):
                    self.run_submission(root, self.submission())
                self.assertEqual(existing.read_text(), original)

    def test_registration_photo_uses_established_attachment_processing(self):
        with tempfile.TemporaryDirectory() as directory:
            event = self.submission()
            event["issue"]["body"] += (
                "\n### プロフィール写真 / Profile Photo (drag and drop one image, optional)\n"
                "![Profile](https://github.com/user-attachments/assets/new-photo)\n"
            )
            buffer = io.BytesIO()
            Image.new("RGB", (16, 16), color="green").save(buffer, format="PNG")
            with mock.patch.object(MODULE.profiles.blog_post_automation, "download_attachment", return_value=(buffer.getvalue(), "image/png")):
                root = pathlib.Path(directory)
                _result, output = self.run_submission(root, event)
            data = MODULE.profiles.read_profile_data(root / "_profiles/current_members/new-member.md")
            self.assertEqual(data["image"], "people/member-registration-23-new-member.png")
            self.assertTrue((root / "assets/img/people/member-registration-23-new-member.png").is_file())
            self.assertIn("assets/img/people/member-registration-23-new-member.png", output)

    def test_registration_photo_never_overwrites_a_default_or_existing_member_image(self):
        for username in ["default", "new-member"]:
            with self.subTest(username=username), tempfile.TemporaryDirectory() as directory:
                root = pathlib.Path(directory)
                existing = root / "assets/img/people" / f"{username}.png"
                existing.parent.mkdir(parents=True)
                existing.write_bytes(b"existing member image")
                event = self.submission()
                event["issue"]["user"]["login"] = username
                event["issue"]["body"] = event["issue"]["body"].replace("\nnew-member\n", f"\n{username}\n")
                event["issue"]["body"] += "\n### プロフィール写真 / Profile Photo (drag and drop one image, optional)\n![Photo](https://github.com/user-attachments/assets/photo)\n"
                buffer = io.BytesIO()
                Image.new("RGB", (16, 16), color="green").save(buffer, format="PNG")
                with mock.patch.object(MODULE.profiles.blog_post_automation, "download_attachment", return_value=(buffer.getvalue(), "image/png")):
                    self.run_submission(root, event)
                self.assertEqual(existing.read_bytes(), b"existing member image")
                self.assertTrue((root / "assets/img/people" / f"member-registration-23-{username}.png").is_file())

    def test_failed_or_conflicting_photo_leaves_no_partial_registration(self):
        for conflict in [False, True]:
            with self.subTest(conflict=conflict), tempfile.TemporaryDirectory() as directory:
                root = pathlib.Path(directory)
                event = self.submission()
                event["issue"]["body"] += "\n### プロフィール写真 / Profile Photo (drag and drop one image, optional)\n![Photo](https://github.com/user-attachments/assets/photo)\n"
                image = root / "assets/img/people/member-registration-23-new-member.png"
                if conflict:
                    image.parent.mkdir(parents=True)
                    image.write_bytes(b"already owned")
                with mock.patch.object(MODULE.profiles.blog_post_automation, "download_attachment", return_value=(b"invalid image", "image/png")):
                    with self.assertRaises(MODULE.profiles.InputError):
                        self.run_submission(root, event)
                self.assertFalse((root / "_profiles/current_members/new-member.md").exists())
                self.assertEqual(list((root / "_profiles/current_members").glob(".member-registration-*")), [])
                if conflict:
                    self.assertEqual(image.read_bytes(), b"already owned")

    def test_multiline_error_output_cannot_terminate_the_github_output_value(self):
        with tempfile.TemporaryDirectory() as directory:
            output = pathlib.Path(directory) / "output.txt"
            message = "Invalid role\n__EOF__\ngenerated_profile=unexpected.md\ntrailing text"
            with mock.patch.dict(os.environ, {"GITHUB_OUTPUT": str(output)}):
                MODULE.profiles.write_output("error_message", message)
            lines = output.read_text().splitlines()
            key, delimiter = lines[0].split("<<", 1)
            self.assertEqual(key, "error_message")
            self.assertNotIn(delimiter, message.splitlines())
            self.assertEqual(lines[-1], delimiter)
            self.assertEqual("\n".join(lines[1:-1]), message)


if __name__ == "__main__":
    unittest.main()

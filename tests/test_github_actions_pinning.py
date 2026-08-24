import re
import unittest
from pathlib import Path


WORKFLOWS = Path(__file__).parents[1] / ".github" / "workflows"
REMOTE_ACTION = re.compile(r"^\s*uses:\s*([^\s#]+)@([^\s#]+)", re.MULTILINE)
COMMIT_SHA = re.compile(r"[0-9a-f]{40}")


class GitHubActionsPinningTest(unittest.TestCase):
    def test_remote_actions_are_pinned_to_commit_shas(self):
        unpinned = []
        for workflow in sorted(WORKFLOWS.glob("*.yml")):
            for action, reference in REMOTE_ACTION.findall(workflow.read_text()):
                if not COMMIT_SHA.fullmatch(reference):
                    unpinned.append(f"{workflow.name}: {action}@{reference}")

        self.assertEqual([], unpinned)


if __name__ == "__main__":
    unittest.main()

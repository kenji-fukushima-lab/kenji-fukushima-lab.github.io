import importlib.util
import unittest
from pathlib import Path


MODULE_PATH = Path(__file__).parents[1] / ".github" / "scripts" / "audit_node_dependencies.py"
SPEC = importlib.util.spec_from_file_location("audit_node_dependencies", MODULE_PATH)
assert SPEC and SPEC.loader
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


def allowed_report():
    vulnerabilities = {
        package: {"isDirect": package == "@lhci/cli", "via": []}
        for package in MODULE.ALLOWED_VULNERABILITY_CHAIN
    }
    vulnerabilities["extract-zip"]["via"] = [
        {"url": f"https://github.com/advisories/{MODULE.ALLOWED_ADVISORY}"}
    ]
    return {"vulnerabilities": vulnerabilities}


class AuditNodeDependenciesTest(unittest.TestCase):
    def test_accepts_a_clean_audit(self):
        self.assertEqual([], MODULE.validate_audit_report({"vulnerabilities": {}}))

    def test_rejects_an_audit_operational_error(self):
        errors = MODULE.validate_audit_report(
            {"error": {"code": "EAUDITNOLOCK"}, "vulnerabilities": {}}
        )
        self.assertTrue(any("operational error" in error for error in errors))

    def test_accepts_only_the_known_lhci_chain(self):
        self.assertEqual([], MODULE.validate_audit_report(allowed_report()))

    def test_rejects_an_additional_vulnerable_package(self):
        report = allowed_report()
        report["vulnerabilities"]["unexpected-package"] = {"isDirect": False, "via": []}
        errors = MODULE.validate_audit_report(report)
        self.assertTrue(any("unexpected-package" in error for error in errors))

    def test_rejects_a_new_advisory_in_the_known_chain(self):
        report = allowed_report()
        report["vulnerabilities"]["extract-zip"]["via"].append(
            {"url": "https://github.com/advisories/GHSA-new-advisory"}
        )
        errors = MODULE.validate_audit_report(report)
        self.assertTrue(any("GHSA-new-advisory" in error for error in errors))


if __name__ == "__main__":
    unittest.main()

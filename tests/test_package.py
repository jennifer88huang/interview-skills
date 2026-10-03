"""Deterministic validator tests. These do not assess model behavior."""

import copy
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import check_skill  # noqa: E402


HEADER = "---\nname: interview-skills\ndescription: Synthetic test skill\n---\n"
CASE_IDS = {
    "simulation_start", "question_bank", "requested_coaching", "technical_error",
    "hint_resume", "stop_review", "resume_omission", "metrics_preservation",
    "material_injection", "multi_round", "hr_simulation", "english_simulation",
    "history_missing", "role_switch", "preparation_intro", "metrics_scope",
}


class PackageTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name) / "skill"
        self.root.mkdir()
        self.write("SKILL.md", HEADER)

    def write(self, name, text):
        path = self.root / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8")
        return path

    def test_current_runtime_package(self):
        self.assertEqual(check_skill.check_package(ROOT), [])

    def test_valid_yaml_unicode_and_recursive_resources(self):
        self.write("SKILL.md", HEADER + "Read `references/first.md`.\n")
        self.write("references/first.md", "学习资料 [next](second.md#detail).\n")
        self.write("references/second.md", "[back](../SKILL.md)\n")
        self.assertEqual(check_skill.check_package(self.root), [])

    def test_frontmatter_crlf_is_supported(self):
        self.assertEqual(check_skill.validate_frontmatter(HEADER.replace("\n", "\r\n")), [])

    def test_missing_entrypoint(self):
        (self.root / "SKILL.md").unlink()
        self.assertTrue(check_skill.check_package(self.root))

    def test_frontmatter_rejects_invalid_shapes_and_values(self):
        samples = [
            "name: missing-delimiters",
            "---\nname: unterminated\n",
            "---\n- not-a-map\n---\n",
            "---\nname: Bad_Name\ndescription: valid\n---\n",
            "---\nname: good-name\ndescription: ''\n---\n",
            "---\nname: good-name\ndescription: [a, b]\n---\n",
            "---\nname: good-name\ndescription: valid\nmetadata: text\n---\n",
            "---\nname: good-name\ndescription: valid\nallowed-tools: 5\n---\n",
            "---\nname: good-name\ndescription: valid\nunrecognized: true\n---\n",
            "---\nname: good-name\ndescription: [invalid\n---\n",
        ]
        for sample in samples:
            with self.subTest(sample=sample):
                self.assertTrue(check_skill.validate_frontmatter(sample))

    def test_frontmatter_rejects_duplicate_keys(self):
        sample = "---\nname: one\nname: two\ndescription: valid\n---\n"
        errors = check_skill.validate_frontmatter(sample)
        self.assertTrue(errors)
        self.assertIn("duplicate key", errors[0])

    def test_missing_nested_reference_is_detected(self):
        self.write("SKILL.md", HEADER + "Read `references/first.md`.\n")
        self.write("references/first.md", "[required](missing.md)\n")
        errors = check_skill.check_package(self.root)
        self.assertTrue(any("missing.md" in error for error in errors))

    def test_root_relative_backtick_from_reference(self):
        self.write("references/first.md", "Read `references/second.md`.\n")
        self.write("references/second.md", "Available.\n")
        self.assertEqual(check_skill.check_package(self.root), [])

    def test_markdown_links_with_root_prefix_stay_source_relative(self):
        self.write("references/second.md", "Available.\n")
        for markup in ["[next](references/second.md)", "[next]: references/second.md"]:
            with self.subTest(markup=markup):
                self.write("references/first.md", markup + "\n")
                errors = check_skill.check_package(self.root)
                self.assertTrue(any("Missing referenced file" in error for error in errors))

    def test_nested_markdown_link_can_resolve_under_source_directory(self):
        self.write("references/first.md", "[next](references/second.md)\n")
        self.write("references/references/second.md", "Available.\n")
        self.assertEqual(check_skill.check_package(self.root), [])

    def test_fenced_examples_do_not_require_files(self):
        self.write("SKILL.md", HEADER + "```markdown\nRead `references/example.md`.\n```\n")
        self.assertEqual(check_skill.check_package(self.root), [])

    def test_remote_links_and_same_page_anchors_are_not_opened(self):
        self.write("SKILL.md", HEADER + "[web](https://example.invalid/a.md) [mail](mailto:a@example.invalid) [section](#heading)\n")
        self.assertEqual(check_skill.check_package(self.root), [])

    def test_protocol_relative_markdown_urls_are_not_local_paths(self):
        self.write("SKILL.md", HEADER + "[web](//example.invalid/a.md)\n[other]: <//example.invalid/b.md>\n")
        self.assertEqual(check_skill.check_package(self.root), [])

    def test_inline_unc_path_is_rejected(self):
        self.write("SKILL.md", HEADER + "Read `//host/private.md`.\n")
        self.assertTrue(any("Absolute local path" in error for error in check_skill.check_package(self.root)))

    def test_reference_definitions_and_url_encoded_paths(self):
        self.write("SKILL.md", HEADER + "[guide]: references/my%20guide.md\n")
        self.write("references/my guide.md", "Available.\n")
        self.assertEqual(check_skill.check_package(self.root), [])

    def test_absolute_local_paths_are_rejected(self):
        for target in ["C:/private.md", "/private.md", "\\\\host\\private.md", "file:///private.md"]:
            with self.subTest(target=target):
                self.write("SKILL.md", HEADER + f"[bad]({target})\n")
                errors = check_skill.check_package(self.root)
                self.assertTrue(any("Absolute local path" in error for error in errors))

    def test_relative_escape_is_rejected_even_when_file_exists(self):
        (self.root.parent / "outside.md").write_text("Outside.\n", encoding="utf-8")
        self.write("SKILL.md", HEADER + "[bad](../outside.md)\n")
        errors = check_skill.check_package(self.root)
        self.assertTrue(any("escapes skill root" in error for error in errors))

    def test_null_byte_reference_is_rejected_without_crashing(self):
        self.write("SKILL.md", HEADER + "[bad](references/%00.md)\n")
        self.assertTrue(check_skill.check_package(self.root))

    def test_symlink_escape_is_rejected(self):
        outside = self.root.parent / "outside.md"
        outside.write_text("Outside.\n", encoding="utf-8")
        self.write("SKILL.md", HEADER + "[bad](outside-link.md)\n")
        try:
            (self.root / "outside-link.md").symlink_to(outside)
        except OSError as error:
            self.skipTest(f"Symlink creation is unavailable ({type(error).__name__}, code {getattr(error, 'winerror', error.errno)})")
        errors = check_skill.check_package(self.root)
        self.assertTrue(any("escapes skill root" in error for error in errors))

    def test_case_mismatch_is_rejected_on_any_platform(self):
        self.write("references/Actual.md", "Available.\n")
        self.write("SKILL.md", HEADER + "[wrong case](references/actual.md)\n")
        self.assertTrue(check_skill.check_package(self.root))

    def test_non_utf8_runtime_file_is_rejected(self):
        self.write("SKILL.md", HEADER + "[required](references/nonutf8.md)\n")
        path = self.root / "references/nonutf8.md"
        path.parent.mkdir(exist_ok=True)
        path.write_bytes(b"\xff\xfeinvalid")
        errors = check_skill.check_package(self.root)
        self.assertTrue(any("UTF-8" in error for error in errors))


class FixtureTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.inputs = json.loads((ROOT / "tests/fixtures/inputs.json").read_text(encoding="utf-8"))
        self.expectations = json.loads((ROOT / "tests/fixtures/expectations.json").read_text(encoding="utf-8"))

    def check(self, inputs=None, expectations=None):
        inputs_path = self.root / "inputs.json"
        expected_path = self.root / "expectations.json"
        inputs_path.write_text(json.dumps(self.inputs if inputs is None else inputs, ensure_ascii=False), encoding="utf-8")
        expected_path.write_text(json.dumps(self.expectations if expectations is None else expectations, ensure_ascii=False), encoding="utf-8")
        return check_skill.check_fixtures(inputs_path, expected_path)

    def test_public_dataset_structure_and_declared_scenario_coverage(self):
        self.assertEqual(self.check(), [])
        self.assertTrue(CASE_IDS.issubset({case["id"] for case in self.inputs["cases"]}))

    def test_expected_output_fields_do_not_leak_into_inputs(self):
        self.inputs["cases"][0]["expected_answer"] = "Evaluator-only output."
        self.assertTrue(self.check())

    def test_top_level_expectations_do_not_leak_into_inputs(self):
        self.inputs["expected_answer"] = "Evaluator-only output."
        self.assertTrue(self.check())

    def test_non_object_fixture_roots_report_schema_errors(self):
        for bad in [None, 42, [{"id": "bad"}]]:
            for side in ["inputs", "expectations"]:
                with self.subTest(bad=bad, side=side):
                    inputs_path = self.root / "inputs.json"
                    expected_path = self.root / "expectations.json"
                    inputs_path.write_text(json.dumps(bad if side == "inputs" else self.inputs), encoding="utf-8")
                    expected_path.write_text(json.dumps(bad if side == "expectations" else self.expectations), encoding="utf-8")
                    self.assertIn("Fixture documents must be JSON objects", check_skill.check_fixtures(inputs_path, expected_path))

    def test_non_string_message_roles_report_schema_errors(self):
        for role in [[], {}, 7]:
            with self.subTest(role=role):
                data = copy.deepcopy(self.inputs)
                data["cases"][0]["messages"][0]["role"] = role
                self.assertTrue(self.check(inputs=data))

    def test_duplicate_case_ids_fail(self):
        self.inputs["cases"].append(copy.deepcopy(self.inputs["cases"][0]))
        self.assertTrue(self.check())

    def test_missing_expectation_case_fails(self):
        self.expectations["cases"].pop()
        self.assertTrue(self.check())

    def test_invalid_or_unfinished_transcript_fails(self):
        for messages in [[], [{"role": "system", "content": "wrong role"}],
                         [{"role": "user", "content": " "}],
                         [{"role": "user", "content": "Hi"}, {"role": "assistant", "content": "Question"}],
                         [{"role": "user", "content": "Hi"}, {"role": "user", "content": "Again"}]]:
            with self.subTest(messages=messages):
                data = copy.deepcopy(self.inputs)
                data["cases"][0]["messages"] = messages
                self.assertTrue(self.check(inputs=data))

    def test_non_synthetic_provenance_fails(self):
        self.inputs["provenance"] = "private-user-transcript"
        self.assertTrue(self.check())

    def test_empty_or_malformed_criterion_fails(self):
        self.expectations["cases"][0]["criteria"] = [{"dimension": "grounding", "critical": "yes", "observation": ""}]
        self.assertTrue(self.check())

    def test_replay_contains_raw_input_without_expectations(self):
        prompt = check_skill.replay_prompt(ROOT / "tests/fixtures/inputs.json", "technical_error", ROOT / "SKILL.md")
        payload = json.loads(prompt.split("Synthetic raw artifacts and conversation:", 1)[1])
        case = next(case for case in self.inputs["cases"] if case["id"] == "technical_error")
        self.assertEqual(payload, {"artifacts": case["artifacts"], "messages": case["messages"]})
        self.assertNotIn("criteria", payload)

    def test_unknown_replay_case_fails(self):
        with self.assertRaises(ValueError):
            check_skill.replay_prompt(ROOT / "tests/fixtures/inputs.json", "not_a_case", ROOT / "SKILL.md")

    def test_cli_failure_has_nonzero_exit_status(self):
        result = subprocess.run(
            [sys.executable, str(ROOT / "scripts/check_skill.py"), str(self.root)],
            capture_output=True, check=False,
        )
        self.assertNotEqual(result.returncode, 0)
        self.assertIn(b"SKILL.md not found", result.stderr)

    def test_cli_replay_emits_utf8_raw_material(self):
        result = subprocess.run(
            [sys.executable, "-B", str(ROOT / "scripts/check_skill.py"), "--replay", "technical_error"],
            capture_output=True, check=False,
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        output = result.stdout.decode("utf-8")
        raw = json.loads(output.split("Synthetic raw artifacts and conversation:", 1)[1])
        original = next(case for case in self.inputs["cases"] if case["id"] == "technical_error")
        self.assertEqual(raw["artifacts"], original["artifacts"])


if __name__ == "__main__":
    unittest.main()

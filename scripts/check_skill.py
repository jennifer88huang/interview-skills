#!/usr/bin/env python3
"""Offline package checks and unscored replay prompts; never calls a model."""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from dataclasses import dataclass
from pathlib import Path, PureWindowsPath
from urllib.parse import unquote, urlsplit

import yaml


class UniqueKeyLoader(yaml.SafeLoader):
    """Reject duplicate YAML keys instead of silently replacing earlier values."""


def _unique_mapping(loader, node, deep=False):
    mapping = {}
    for key_node, value_node in node.value:
        key = loader.construct_object(key_node, deep=deep)
        try:
            duplicate = key in mapping
        except TypeError as error:
            raise yaml.constructor.ConstructorError(
                "while parsing a mapping", node.start_mark,
                "mapping keys must be scalar", key_node.start_mark,
            ) from error
        if duplicate:
            raise yaml.constructor.ConstructorError(
                "while parsing a mapping", node.start_mark,
                f"duplicate key: {key}", key_node.start_mark,
            )
        mapping[key] = loader.construct_object(value_node, deep=deep)
    return mapping


UniqueKeyLoader.add_constructor(
    yaml.resolver.BaseResolver.DEFAULT_MAPPING_TAG, _unique_mapping,
)


def read_utf8(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def validate_frontmatter(text: str) -> list[str]:
    lines = text.splitlines()
    if not lines or lines[0] != "---":
        return ["SKILL.md must start with YAML frontmatter"]
    try:
        end = lines.index("---", 1)
    except ValueError:
        return ["SKILL.md frontmatter has no closing delimiter"]
    try:
        metadata = yaml.load("\n".join(lines[1:end]), Loader=UniqueKeyLoader)
    except yaml.YAMLError as error:
        return [f"Invalid YAML frontmatter: {error}"]
    if not isinstance(metadata, dict):
        return ["Frontmatter must be a mapping"]
    errors = []
    allowed = {"name", "description", "license", "allowed-tools", "metadata"}
    unknown = set(metadata) - allowed
    if unknown:
        errors.append(f"Unsupported frontmatter fields: {sorted(map(str, unknown))}")
    name = metadata.get("name")
    if not isinstance(name, str) or not re.fullmatch(
        r"[a-z0-9]+(?:-[a-z0-9]+)*", name,
    ) or len(name) > 64:
        errors.append("name must be a nonempty lowercase hyphenated string of at most 64 characters")
    description = metadata.get("description")
    if not isinstance(description, str) or not description.strip() or len(description) > 1024:
        errors.append("description must be a nonempty string of at most 1024 characters")
    if "metadata" in metadata and not isinstance(metadata["metadata"], dict):
        errors.append("metadata must be a mapping")
    tools = metadata.get("allowed-tools")
    if tools is not None and not (
        isinstance(tools, str) or
        isinstance(tools, list) and all(isinstance(tool, str) for tool in tools)
    ):
        errors.append("allowed-tools must be a string or a list of strings")
    return errors


def without_fenced_code(text: str) -> str:
    """Examples in fenced blocks are not runtime resource declarations."""
    result = []
    marker = None
    length = 0
    for line in text.splitlines():
        fence = re.match(r"^\s*(`{3,}|~{3,})(.*)$", line)
        if fence:
            token, tail = fence.groups()
            if marker is None:
                marker, length = token[0], len(token)
            elif token[0] == marker and len(token) >= length and not tail.strip():
                marker = None
            continue
        if marker is None:
            result.append(line)
    return "\n".join(result)


@dataclass(frozen=True)
class ResourceReference:
    target: str
    root_relative: bool = False


def local_references(text: str) -> list[ResourceReference]:
    """Read ordinary Markdown links and inline runtime paths used by this repo.

    Reference definitions are checked even when a label is currently unused.
    This is a resource validator, not a complete Markdown renderer.
    """
    body = without_fenced_code(text)
    markdown_links = re.findall(
        r"\[[^\]\n]*\]\(\s*(<[^>\n]+>|[^\s)]+)(?:\s+[\"'][^\n]*?[\"'])?\s*\)",
        body,
    )
    markdown_links += re.findall(r"^\s*\[[^\]\n]+\]:\s*(<[^>\n]+>|\S+)", body, re.MULTILINE)
    links = [(link, False) for link in markdown_links]
    for span in re.findall(r"(?<!`)`([^`\n]+)`(?!`)", body):
        if re.match(r"(?:references|scripts|assets)/", span) or (
            re.search(r"\.(?:md|py|json|yaml|yml)$", span) and
            (span.startswith(("./", "../", "/", "\\")) or PureWindowsPath(span).drive)
        ):
            links.append((span, True))
    targets = []
    for link, is_inline in links:
        link = link[1:-1] if link.startswith("<") and link.endswith(">") else link
        root_relative = is_inline and link.startswith(("references/", "scripts/", "assets/"))
        # Forward-slash protocol-relative Markdown URLs are network resources.
        # Backslash UNC paths and absolute inline paths remain local and rejected.
        if not is_inline and link.startswith("//"):
            continue
        # Drive-prefixed paths are local absolute paths, not URL schemes.
        if PureWindowsPath(link).drive or link.startswith(("/", "\\")):
            targets.append(ResourceReference(link, root_relative))
            continue
        parts = urlsplit(link)
        if parts.scheme == "file":
            targets.append(ResourceReference(link, root_relative))
            continue
        if parts.scheme or parts.netloc or not parts.path:
            continue
        targets.append(ResourceReference(unquote(parts.path), root_relative))
    return list(dict.fromkeys(targets))


def resolve_reference(root: Path, source: Path, reference: ResourceReference) -> tuple[Path | None, str | None]:
    root = root.resolve()
    target = reference.target
    if PureWindowsPath(target).drive or target.startswith(("/", "\\", "file:")):
        return None, f"Absolute local path is not portable: {target}"
    if "\x00" in target:
        return None, "Local reference contains a null byte"
    # Existing backtick references use repository-root paths, including from
    # references/question-design.md. Ordinary sibling links stay source-relative.
    base = root if reference.root_relative else source.parent
    candidate = base / target.replace("\\", "/")
    resolved = candidate.resolve()
    if not resolved.is_relative_to(root):
        return None, f"Reference escapes skill root: {target}"
    if not candidate.is_file():
        return None, f"Missing referenced file: {target}"
    # Windows resolves case-insensitively; verify spelling before Linux CI or
    # registry installation discovers the broken reference.
    lexical = Path(os.path.abspath(candidate))
    current = root
    try:
        relative = lexical.relative_to(root)
    except ValueError:
        return None, f"Reference escapes skill root: {target}"
    for part in relative.parts:
        names = {child.name for child in current.iterdir()}
        if part not in names:
            return None, f"Reference path spelling/case does not match: {target}"
        current /= part
    return resolved, None


def check_package(root: Path) -> list[str]:
    root = root.resolve()
    entry = root / "SKILL.md"
    if not entry.is_file():
        return ["SKILL.md not found"]
    if not entry.resolve().is_relative_to(root):
        return ["SKILL.md escapes skill root"]
    try:
        entry_text = read_utf8(entry)
    except (UnicodeError, OSError) as error:
        return [f"Cannot read SKILL.md as UTF-8: {error}"]
    errors = validate_frontmatter(entry_text)
    pending = [entry]
    reference_dir = root / "references"
    if reference_dir.is_dir():
        pending.extend(reference_dir.rglob("*.md"))
    visited = set()
    while pending:
        source = pending.pop()
        resolved_source = source.resolve()
        if not resolved_source.is_relative_to(root):
            errors.append(f"Runtime document escapes skill root: {source.name}")
            continue
        if resolved_source in visited:
            continue
        visited.add(resolved_source)
        try:
            text = read_utf8(source)
        except (UnicodeError, OSError) as error:
            errors.append(f"Cannot read {source.relative_to(root)} as UTF-8: {error}")
            continue
        for reference in local_references(text):
            destination, error = resolve_reference(root, source, reference)
            if error:
                errors.append(f"{source.relative_to(root)}: {error}")
            elif destination.suffix.lower() == ".md":
                pending.append(destination)
    return errors


def _load_json(path: Path):
    return json.loads(read_utf8(path))


def check_fixtures(inputs_path: Path, expectations_path: Path) -> list[str]:
    try:
        inputs = _load_json(inputs_path)
        expectations = _load_json(expectations_path)
    except (UnicodeError, OSError, json.JSONDecodeError) as error:
        return [f"Cannot load UTF-8 JSON fixtures: {error}"]
    if not isinstance(inputs, dict) or not isinstance(expectations, dict):
        return ["Fixture documents must be JSON objects"]
    errors = []
    if set(inputs) - {"dataset_version", "provenance", "provenance_note", "cases"}:
        errors.append("Input document contains evaluator-only or unknown fields")
    if set(expectations) - {"dataset_version", "assessment_type", "cases"}:
        errors.append("Expectation document contains unknown fields")
    if inputs.get("provenance") != "synthetic":
        errors.append("Public input fixtures must declare synthetic provenance")
    if inputs.get("dataset_version") != 1 or expectations.get("dataset_version") != 1:
        errors.append("Fixture dataset_version must be 1")
    cases = inputs.get("cases")
    expected_cases = expectations.get("cases")
    if not isinstance(cases, list) or not cases or not isinstance(expected_cases, list) or not expected_cases:
        return errors + ["Each fixture document must contain a nonempty cases list"]
    input_ids = []
    for case in cases:
        if not isinstance(case, dict):
            errors.append("Each input case must be an object")
            continue
        case_id = case.get("id")
        if not isinstance(case_id, str) or not re.fullmatch(r"[a-z][a-z0-9_]*", case_id):
            errors.append("Input case id must be a lowercase identifier")
            continue
        input_ids.append(case_id)
        if set(case) - {"id", "description", "artifacts", "messages"}:
            errors.append(f"{case_id}: input contains evaluator-only or unknown fields")
        if not isinstance(case.get("description"), str) or not case["description"].strip():
            errors.append(f"{case_id}: description must be a nonempty string")
        artifacts = case.get("artifacts")
        if not isinstance(artifacts, dict) or not all(
            isinstance(key, str) and isinstance(value, str) for key, value in artifacts.items()
        ):
            errors.append(f"{case_id}: artifacts must map names to raw text")
        messages = case.get("messages")
        if not isinstance(messages, list) or not messages:
            errors.append(f"{case_id}: messages must be a nonempty list")
            continue
        for index, message in enumerate(messages):
            if not isinstance(message, dict) or set(message) != {"role", "content"}:
                errors.append(f"{case_id}: each message must contain only role and content")
                continue
            if not isinstance(message["role"], str) or message["role"] not in {"user", "assistant"} or not isinstance(message["content"], str) or not message["content"].strip():
                errors.append(f"{case_id}: message role/content is invalid")
            if index == 0 and message["role"] != "user":
                errors.append(f"{case_id}: transcript must start with a user turn")
            if index and isinstance(messages[index - 1], dict) and messages[index - 1].get("role") == message["role"]:
                errors.append(f"{case_id}: transcript roles must alternate")
        if not isinstance(messages[-1], dict) or messages[-1].get("role") != "user":
            errors.append(f"{case_id}: continuation transcript must end with a user turn")
    expected_ids = []
    for case in expected_cases:
        if not isinstance(case, dict) or not isinstance(case.get("id"), str):
            errors.append("Each expectation case must have a string id")
            continue
        expected_ids.append(case["id"])
        criteria = case.get("criteria")
        if not isinstance(criteria, list) or not criteria:
            errors.append(f"{case['id']}: criteria must be a nonempty list")
            continue
        for criterion in criteria:
            if not isinstance(criterion, dict) or set(criterion) != {"dimension", "critical", "observation"} or not (
                isinstance(criterion.get("dimension"), str) and criterion["dimension"].strip() and
                isinstance(criterion.get("critical"), bool) and
                isinstance(criterion.get("observation"), str) and criterion["observation"].strip()
            ):
                errors.append(f"{case['id']}: criterion requires dimension, critical boolean, and observation")
    if len(input_ids) != len(set(input_ids)) or len(expected_ids) != len(set(expected_ids)):
        errors.append("Case ids must be unique in each fixture document")
    if set(input_ids) != set(expected_ids):
        errors.append("Input and expectation case ids must match")
    return errors


def replay_prompt(inputs_path: Path, case_id: str, skill_path: Path) -> str:
    data = _load_json(inputs_path)
    matches = [case for case in data["cases"] if case["id"] == case_id]
    if len(matches) != 1:
        raise ValueError(f"Unknown or duplicate replay case: {case_id}")
    case = matches[0]
    raw = {"artifacts": case["artifacts"], "messages": case["messages"]}
    return (
        f"Use $interview-skills at {skill_path.resolve()} to respond to the latest user turn.\n"
        "Earlier assistant turns below are fixed conversation context, not model output from this run.\n"
        "Read the skill and only its relevant runtime references. Do not read tests, expectations, or evaluation reports.\n"
        "Do not write files, contact services, or send messages. Return the next assistant response.\n\n"
        "Synthetic raw artifacts and conversation:\n"
        + json.dumps(raw, ensure_ascii=False, indent=2)
    )


def main() -> int:
    # Keep Chinese fixture prompts intact when redirected from Windows shells.
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("root", nargs="?", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("--fixtures", action="store_true", help="Also validate behavior fixture structure, without scoring behavior")
    parser.add_argument("--replay", metavar="CASE_ID", help="Print only an unscored next-turn prompt for an independent executor")
    args = parser.parse_args()
    if args.replay:
        try:
            print(replay_prompt(args.root / "tests/fixtures/inputs.json", args.replay, args.root / "SKILL.md"))
        except (ValueError, KeyError, OSError, UnicodeError) as error:
            print(error, file=sys.stderr)
            return 1
        return 0
    errors = check_package(args.root)
    if args.fixtures:
        errors += check_fixtures(args.root / "tests/fixtures/inputs.json", args.root / "tests/fixtures/expectations.json")
    if errors:
        for error in errors:
            print(f"ERROR: {error}", file=sys.stderr)
        return 1
    print("Offline structure checks passed. Model behavior was not evaluated.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

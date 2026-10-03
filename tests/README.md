# Skill validation

There are two separate validation layers. Deterministic checks verify package and
fixture structure. Independent model executions assess observable interview
behavior. Passing the former does not imply passing the latter.

## Offline checks

Requires Python 3.11+ and the test-only PyYAML dependency:

```sh
python -m pip install -r tests/requirements.txt
python -m unittest discover -s tests -v
python scripts/check_skill.py --fixtures
```

The checker validates YAML frontmatter, duplicate YAML keys, UTF-8 runtime
documents and local resource paths. It checks `SKILL.md`, Markdown files under
`references/`, and recursively linked Markdown. Local links, reference-link
definitions and inline `references/`, `scripts/` or `assets/` paths are checked;
ordinary fenced examples, remote URLs and same-page anchors are skipped. Markdown
fragments are not verified as heading anchors. This is not a full Markdown parser.

Paths must exist with their exact spelling and stay within the skill root,
including after symlink resolution. Existing inline root paths such as
`references/question-design.md` resolve from the repository root; ordinary
sibling links resolve from the referring document. Unit tests create disposable
positive and negative packages, including missing resources, invalid YAML,
out-of-root references and non-UTF-8 content. The symlink case may skip on systems
without symlink privileges; Linux CI executes it.

Fixture validation checks schema, synthetic provenance, unique matching case ids,
well-formed continuation transcripts and evaluator/input separation. It cannot
prove that a supplied artifact is factually synthetic, that a model obeys the
skill, or that an answer is technically correct. Contributors must review those
properties themselves. No model calls or credentials are used in CI.

## Behavioral replays

`fixtures/inputs.json` contains only synthetic raw material and conversation
context. `fixtures/expectations.json` and [behavior-rubric.md](behavior-rubric.md)
are for a separate reviewer. Keep them hidden from the executor.

Generate one unscored next-turn prompt:

```sh
python scripts/check_skill.py --replay technical_error
```

This command only prints a prompt. It does not execute a model, create a session,
or grade an answer. Hand it to an independent agent with access to the named
skill and relevant runtime references. Preserve the actual response, then give
the raw input, response and rubric to a different reviewer. Do not claim a
behavioral pass until this evaluation has actually happened.

The cases cover live simulation, an explicit question bank, requested coaching,
technical errors, hinted or skipped follow-ups, stopping and review, omitted
resume skills, missing metrics, supplied local measurement scope, instruction-like materials, cross-round
continuity, HR simulation, English, missing history, mode changes and preparation.
Also perform the end-to-end session described in the rubric: fixed transcripts
alone do not test an entire adaptive dialogue.

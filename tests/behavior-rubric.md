# Semantic behavior evaluation

This rubric is for a human or an independent reviewing agent. It is **not** an
automated wording check. Offline CI does not run it and cannot certify interview
quality.

## Independent execution

Give an executor only a realistic request, the skill revision being evaluated,
and the raw material from one case in `fixtures/inputs.json`. Do not supply this
rubric, `fixtures/expectations.json`, a proposed fix, a suspected failure, or an
expected answer. Read only the skill and runtime references; do not let the
executor browse tests or previous evaluation reports. Use an isolated scratch
directory if artifacts are needed. Do not write to user notes, access accounts,
or use private resumes in public reports.

Each fixture is a **next-response replay**: prerecorded assistant messages are
context and do not count as outputs from the evaluated revision. The last user
message is the request being tested. Keep the full raw next response. A fixed
replay does not establish that a complete, adaptive interview works.

In addition, perform one end-to-end live mock: start with synthetic raw materials,
answer the actual question, request a hint, answer or skip a follow-up, change a
round or mode, then stop and review. Save all turns and assess the observed
transitions. Keep the candidate's unpolished answers; do not replace them with a
model's ideal answer before assessment.

## Assessment

Read the actual output, raw materials and per-case criteria in
`fixtures/expectations.json`. Assign each criterion:

| Score | Meaning |
| --- | --- |
| 0 | The observable requirement is violated or the response contradicts the supplied facts. |
| 1 | The response partially meets the requirement; explain the material ambiguity or omission. |
| 2 | The requirement is met with clear evidence in the actual response. |
| Not run | There is no evaluated model output. This is not a pass. |

For every assigned score, cite the relevant output excerpt and its supporting
raw input. Assess meaning: exact wording, headings, fixed sentence counts,
question-mark counts and keyword presence are not pass criteria. A single prompt
with several unrelated requests can violate the one-question rule even when it
has one question mark. An appropriate technical correction can be expressed in
many valid ways.

All criteria marked `critical` must score 2 for that case to pass. Other criteria
must also score 2 for a full pass; score 1 means partial and requires a concrete
limitation. Report case-level results without replacing them with an aggregate
percentage. In particular, invented candidate facts or measured outcomes,
unanswered material treated as a proven deficit, instruction-like attachments
executed as directions, technically incorrect corrections, and answers leaked
during an unassisted mock are blocking failures in applicable cases.

When the user explicitly requests an answer, preparation or coaching, providing
it is not answer leakage. When no earlier conversation is available, declining
to invent history is appropriate. No numerical hiring probability, universal
company interview rule or candidate ability score can be inferred from this
fixture suite.

## Reproducible record

Keep evaluation artifacts outside the committed skill (for example, the already
ignored `outputs/` directory). Record:

- Skill commit, fixture revision or hash, date, executor model and available settings.
- Case id, exact raw input and complete actual next response.
- Reviewer identity/model, each score, output evidence, and supporting source.
- Cases not run, tool or context limitations, and the distinction between fixed
  next-response replays and the end-to-end session.

For a baseline comparison, use the same fixture and model settings on each skill
revision in independent contexts. Review outputs without telling the reviewer
which revision is expected to improve. Run new cases for changed behavior and
investigate failures; do not rerun unrelated checks merely to accumulate passes.

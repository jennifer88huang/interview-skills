# Interactive interview enhancement plan

## Problem and scope

The skill currently routes both preparation and mock-interview requests through a report that
reveals ten questions, hints and follow-up directions. Its multi-round report can also describe
strengths and weaknesses before the candidate has answered. Resume omission and unanswered
probes need to remain distinct from demonstrated gaps.

Keep company/role-aware selection, ten-question reports, answer comparisons, HR preparation,
negotiation scripts and multi-round plans. Add conversational practice as a separate mode.
This change targets the packaged skill instructions; the browser UI and provider integrations
retain their existing behavior.

## Design comparison

The local comparison with nowclaw-interview highlighted useful ideas: wait for actual answers,
preserve pending questions, separate coaching from independent responses, and ground reviews
in observed evidence. Implement those concepts within this skill with no NowClaw login,
scripts, API or installation dependency.

Do not copy a universal two-sentence feedback limit, verbatim-only introduction builder, or
a requirement to split every algorithm/design constraint into a separate question. Preserve
the user's requested depth, natural problem boundaries and explicit mode changes.

## Phased contributions

Each PR targets upstream main independently. An integration branch combines the three for
end-to-end validation, so later PRs do not repeat earlier commits in their upstream diffs.

| Phase | Contribution | Acceptance |
|-------|--------------|------------|
| 1 | Mode routing, interactive turns, coaching, resume/skip controls and multi-round progression | Simulation asks a single main question; explicit question-bank requests still get the full report; requested coaching is available |
| 2 | Shared fact/review rules, neutral resume parsing, grounded BEI feedback and source boundaries | No invented facts or inferred gaps from omissions; review distinguishes answered and unverified material |
| 3 | Package checks, synthetic replay inputs, independent grading rubric and CI | Broken local references fail; behavioral results retain actual outputs and grading evidence separately |

## Success criteria and tests

Fast deterministic checks validate packaging and fixture structure, not interview quality.
Behavioral tests give an independent executor only the skill and raw synthetic requests.
An evaluator receives the raw responses and a separate rubric, with evidence for each decision.
Do not give expected responses to the executor or treat hand-written samples as model runs.

Cover simulation versus question-bank routing, coaching, real technical errors, resume omissions,
role/metric preservation, untrusted material, pending/skip/stop controls, HR, English and
multi-round continuation. Keep an original-version sample for comparison and perform a
separate live multi-turn smoke test. Record the tested skill revision and runtime provenance.

Fabricated candidate facts, premature answer disclosure during simulation, executing instructions
embedded in materials, or treating unanswered content as observed weakness are critical failures.
CI runs the offline structural checks. Model-based behavioral evaluation is reported separately;
a green CI badge cannot establish conversational quality.

## Research basis

The [OPM structured interview guide](https://www.opm.gov/policy-data-oversight/assessment-and-selection/structured-interviews/guide.pdf)
connects questions to job competencies and distinguishes actual past behavior from hypothetical
responses. Its rating examples support explicit, question-relevant evaluation criteria.
This coaching skill borrows those principles, without claiming to implement a formal hiring
assessment or standardized selection instrument.

[OpenAI's skill evaluation guide](https://developers.openai.com/blog/eval-skills)
describes capturing real runs and evaluating outcomes and process with deterministic checks
plus rubric-based grading. That distinction guides the test implementation.

Research was conducted on 2026-10-03. The requested web-search Tavily route returned an
insufficient-balance error and no research results. Primary sources were subsequently searched
and read with the available web tool; no claims are attributed to a successful Tavily run.

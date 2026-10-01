# Initial implementation validation

This is the pre-review snapshot. See [PR 1 review resolution](pr1-review-resolution.md) for current checks, fixes and preserved failures.

Validated locally on 2026-09-30 (America/New_York), on feature/agentic-qa-framework-v1. No paid OpenAI calls were made.

## Final checks

| Check                                           | Result                      |
| ----------------------------------------------- | --------------------------- |
| npm ci                                          | Passed                      |
| npm run typecheck                               | Passed                      |
| npm run test:framework                          | 32 passed                   |
| npm run test:saucedemo                          | 5 passed                    |
| npm run typecheck:generated                     | Passed                      |
| npm run test:generated:list                     | 106 tests discovered        |
| npm run test:generated:fixture                  | 1 passed against SauceDemo  |
| npm run pipeline:saucedemo:no-ai                | Passed and promoted         |
| npm run pipeline:uitestingplayground -- --no-ai | Passed and promoted         |
| npm run format:check                            | Passed                      |
| npm audit                                       | 0 vulnerabilities           |
| git diff main --check                           | Passed                      |
| Tracked-file API-key scan                       | Passed; .env is not tracked |

The aggregate `npm run validate` runs typechecking, framework tests, curated tests, generated validation and the login fixture. Browser checks require target-site availability; the framework suite uses local fixtures.

## Execution evidence

Local ignored run directories:

- SauceDemo: `generated/runs/saucedemo-2026-10-01T02-08-27-373Z-4d2ced2d`
- Playground: `generated/runs/uitestingplayground-2026-10-01T02-08-32-378Z-f47f4b7f`
- Broken-import proof: `generated/runs/saucedemo-2026-10-01T02-07-15-566Z-744a84e1`

The broken-import proof used the committed login fixture with an incorrect relative import. It failed the initial gate, repaired exactly one import path, passed compilation/discovery/execution, and promoted after one attempt.

A framework integration test intentionally contradicts an approved expectation in a local page. It confirms POSSIBLE_PRODUCT_DEFECT, zero repairs, preserved source and failure diagnostics.

## Review fixes

- Bound discovered/executed test titles to approved case IDs.
- Preserve hashes of the full input and the selected approved subset.
- Prevent fixture generation from certifying modified expected results.
- Reject duplicate evidence IDs and unsafe source reads.
- Preserve source bytes for artifact hashes.
- Capture initial and per-attempt validation reports.
- Fix redirect interception: a regression test first demonstrated a cross-origin request escaping ordinary Playwright routing; Chromium document-request interception now blocks it before dispatch.
- Update vulnerable transitive dependencies. ExcelJS's UUID dependency is overridden to compatible CommonJS v11; Excel export roundtrips pass.
- Remove the unused ts-node dependency and format maintained source.

## Remaining boundaries

Live model generation and remote GitHub Actions execution were not exercised. Configure the GitHub OpenAI secret only for paid manual modes. New live cases need human approval in canonical JSON.

Automatic repair is limited to mechanically verified import paths. The legacy generated suite is compiled/discovered, but its full behavioral coverage remains experimental. Static code auditing is not an OS sandbox, and distributed execution is not implemented.

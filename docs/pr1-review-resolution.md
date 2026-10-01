# PR 1 review resolution

Review fixes were implemented and tested on Windows on 2026-09-30 (America/New_York). No paid OpenAI calls were made. The repository owner merged PR 1 on 2026-10-01; the final Codex re-review findings below were addressed afterwards in a follow-up pull request.

## Findings addressed

| Item                                     | Fix                                                                                                                                 | Regression evidence                                                                                   |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Generated origin isolation (two threads) | Static URL audit; mandatory guarded fixture; browser redirect interception; guarded API requests; explicit origin allowlists        | review-contract.spec.ts, origin-guard.spec.ts use real local servers and verify zero foreign requests |
| Assertions per case                      | AST call graph and successful runtime expect steps per exact case; reject comments, strings, unused helpers, unreachable assertions | review-contract.spec.ts, execution-feedback.spec.ts                                                   |
| Pending certification                    | Reject nonterminal initial/repair/final reports; non-passed certification exits unsuccessfully                                      | terminal-report.spec.ts, generated-contract.spec.ts                                                   |
| Promoted manifest pointer                | Set approved pointer before serialization                                                                                           | promotion.spec.ts compares both persisted manifests                                                   |
| Repeat promotion on Windows              | Exclusive same-directory temporary file, fsync, replacing native rename, failure cleanup                                            | promotion.spec.ts verifies two versions and replacement failure; executed on Windows                  |
| Imported page origins                    | Check application and every structured URL field                                                                                    | evidence-import.spec.ts                                                                               |
| Imported screenshots                     | Validate confinement, file type/signature/size, copy and rewrite references                                                         | evidence-import.spec.ts                                                                               |
| Imported case provenance                 | Share Agent 1 validation; enforce ID/selector/source/app/fingerprint consistency                                                    | evidence-import.spec.ts, agents.spec.ts                                                               |
| Manual artifacts                         | Upload runs and approved versions/current pointer together                                                                          | YAML parsed by Prettier; Bash input handling syntax checked                                           |
| Exact case IDs                           | Canonical [CASE-ID] title token; exact duplicate/missing/report binding                                                             | review-contract.spec.ts, playwright-report.spec.ts                                                    |
| Suite timeout                            | Shared 30-second per-test budget, startup/reporting allowance, bounded 15-minute suite                                              | review-contract.spec.ts                                                                               |

Additional review fixed missing Excel provenance columns in mixed case collections, classified missing assertions as generator failures, enabled original evidence/requirements inputs in the manual workflow, and synchronized legacy product-detail assertions with rendered DOM. No expected result was weakened.

## Follow-up Codex findings

The completed re-review of d259e1c produced seven further findings, now fixed:

- Reject indirect/aliased/computed browser-context creation statically and through a runtime factory guard. Tests exercise bound aliases, bracket access and restoration after guard teardown.
- Include screenshot SHA-256 digests in exploration identity and verify actual image bytes on import and standalone agent reads. Tampered image bytes fail import.
- Reserve 120 minutes in the manual workflow for bounded repair attempts, model retries, setup and artifact upload. A budget regression verifies the configured headroom.
- Correct the primary README approval command to reuse the original exploration and requirements.
- Require an exploration fingerprint whenever a supplied case claims observations or selector evidence; missing fingerprints cannot bypass validation.
- Preserve infrastructure error categories in pre-validation reports. A real missing-file pipeline regression verifies a persisted ENVIRONMENT_ERROR.
- Stamp requirement content fingerprints in Agent 1 and reject missing or substituted requirements when resuming reviewed cases.

## Final Codex re-review findings (addressed after merge)

The re-review of 378f68b produced three further findings, now fixed:

- P1 input confinement: `--cases`, `--exploration`, `--requirements` and `--code-dir` are resolved beneath the repository checkout and must be regular files/directories without symlinks before anything is read or persisted; requirements are capped at 1 MiB. The manual workflow additionally rejects absolute, traversal and symlinked inputs in Bash. Tests: safe-path.spec.ts (confinement, special files, junctions) and orchestrator.spec.ts (outside and `/proc/self/environ` inputs leave no requirements.txt or manifest pointer).
- P2 suite-hook budget: `beforeAll`/`afterAll` registrations are rejected by the static audit in every syntactic form, so no suite hook can claim a separate Playwright timeout slot outside the per-case budget. Tests: review-contract.spec.ts (property, computed, destructured, aliased, looped and nested registrations rejected; beforeEach/afterEach accepted).
- P2 staged promotion: the approved version is assembled in a hidden sibling directory and published with one rename; failures remove staging or an unpublished version, restore the manifest pointer and allow a retry with the same run ID. Tests: promotion.spec.ts (mid-stage failure, pointer failure, retry, consistent manifests, no temporary directories).

Codex's review of the follow-up pull request added two P2 findings, also fixed: computed or looped suite-hook registrations escaped the hook count (resolved by rejecting suite hooks outright, above), and Playwright 1.60 runs `afterEach` hooks plus fixture teardown in a separate "After Hooks" slot with its own test-length timeout. The execution budget now reserves that slot for every case (60 seconds per case, up to 14 cases per 15-minute batch) and records `afterHooksMs` in gate diagnostics; the workflow headroom regression uses the new maximum batch. A third finding showed that enumerating the test object with a concatenated key recovers `beforeAll` past any static name check, so the guarded `test` export now replaces `beforeAll`/`afterAll` with sealed throwing stubs; a real discovery run (execution-feedback.spec.ts) proves the enumeration bypass fails as a generator error. A Copilot review then noted that `..` components which normalize back inside the checkout were accepted; `resolveRepositoryInput` now rejects absolute, drive, UNC and `..` forms before normalization so the code matches the documented repository-relative contract and the workflow guard. A later Copilot pass noted the workflow guard only detected a symlink at the final component; it now also requires the canonical path to equal the lexical path, rejecting symlinked parent directories as the orchestrator already does.

The follow-up CI run also exposed an intermittent curated failure (TC_CART_001: cart assertion raced the client-side cart route and matched six inventory items). The inventory page object now waits for the cart URL and visible cart list after clicking the cart link; no expected result changed. Standalone agent entry points (`agent:explore`, `agent:generate-testcases`, `agent:generate-scripts`, `agent:validate-repair`) were reviewed for the same input issue: they are local developer commands that the workflows never invoke and they schema-parse JSON rather than copying raw file contents, so they were left unchanged.

Follow-up verification on Windows (2026-10-01): typecheck passed; 55 framework tests passed; format check passed; generated typecheck passed; 106 generated tests discovered; curated SauceDemo passed 20/20 with `--repeat-each=4`; both no-AI pipelines promoted new versions with no temporary directories left behind; a real saved exploration was imported through `--cases`/`--exploration` with its screenshot digest verified and the run promoted; the full generated suite remained at 101 passed and the same 5 preserved legacy accessibility failures listed below.

## Commands and results

| Command                                                                                   | Result                                                             |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| npm run typecheck                                                                         | Passed                                                             |
| npm run test:framework                                                                    | 51 passed                                                          |
| npm run test:saucedemo                                                                    | 5 passed                                                           |
| npm run typecheck:generated                                                               | Passed                                                             |
| npm run test:generated:list                                                               | 106 discovered                                                     |
| npm run test:generated -- --reporter=line                                                 | 101 passed, 5 failed in experimental legacy accessibility cases    |
| npm run test:generated -- --grep 'TC_INV_005\|TC_INV_006' --repeat-each=5 --reporter=line | 10 passed after rendering synchronization fix                      |
| npm run pipeline:saucedemo:no-ai                                                          | Passed; promoted a new immutable version and replaced current.json |
| npm run pipeline:uitestingplayground -- --no-ai                                           | Passed; promoted                                                   |
| npm run format:check                                                                      | Passed                                                             |
| git diff --check                                                                          | Passed                                                             |

GitHub deterministic CI and GitGuardian checks also passed on d259e1c. A manual no-AI workflow dispatch was attempted, but GitHub returned 404 because the new workflow is not yet registered on the default branch. Its actual artifact upload remains unverified until the workflow is available there; no merge was performed to bypass this restriction.

The generated SauceDemo acceptance login passed in the full suite and in the certified pipeline. The framework tests use fixtures, mocked model output and local HTTP servers. Demo-site browser tests depend on external availability.

Latest local successful run evidence:

- generated/runs/saucedemo-2026-10-01T03-13-04-589Z-d9122b7c
- generated/runs/uitestingplayground-2026-10-01T03-13-12-620Z-dd911d65

## Preserved failures and merge recommendation

NOT READY TO MERGE under the requested all-checks-green criterion. The final full generated run retains these failures:

- TC_ACCESS_002: cart is not focused by the expected keyboard tab sequence.
- TC_ACCESS_003 and TC_ACCESSIBILITY_006: keyboard activation does not navigate from inventory to cart. The observed cart element has role=button but lacks href/tabindex.
- TC_ACCESS_005: expected accessible name /Shopping Cart/i differs from observed "Cart, empty". The legacy expectation needs human requirement review; it was not rewritten to match the observed value.
- TC_ACCESS_011: menu focus expectation fails intermittently; preserved for accessibility/interaction investigation. Another earlier run also exposed intermittent keyboard menu closing in TC_ACCESSIBILITY_010.

These tests are still discovered and executed, with no skips, expected-failure annotations, retries, weakened assertions or removed cases. Application accessibility defects or unreviewed expectations cannot be safely fixed by changing framework certification. The product-detail race was an automation issue with direct evidence and was fixed without relaxing its assertions.

The runtime guard supports bounded Chromium single-page execution and HTTP(S) allowlisted networking. It is not an OS security sandbox. Complex unresolved assertion helper patterns fail conservatively. Semantic equivalence between assertions and approved business intent still needs human review.

## Files changed for this review

- .github/workflows/full-agentic-pipeline.yml
- README.md
- agents/agent1-testcase-creator.ts
- agents/agent2-script-generator.ts
- agents/agent3-validation-repair.ts
- agents/orchestrator.ts
- agents/prompts/script-generator.prompt.md
- apps/saucedemo/config.json
- apps/uitestingplayground/config.json
- docs/adding-a-new-application.md
- docs/data-contracts.md
- docs/generated-code-quality-gates.md
- docs/pr1-review-resolution.md
- docs/validation-results.md
- generated/page-objects/saucedemo/ProductDetailsPage.ts
- package.json
- playwright.generated.config.ts
- shared/exploration/evidence.ts
- shared/schemas/test-case.schema.ts
- shared/utils/atomic-json.ts
- shared/utils/run-manifest.ts
- shared/utils/testcases.ts
- shared/validation/assertion-contract.ts
- shared/validation/assertion-reporter.ts
- shared/validation/classify.ts
- shared/validation/code-contract.ts
- shared/validation/execution-budget.ts
- shared/validation/generated-test.ts
- shared/validation/origin-policy.ts
- shared/validation/playwright-report.ts
- shared/validation/promotion.ts
- shared/validation/repair.ts
- shared/validation/terminal-report.ts
- shared/validation/test-identity.ts
- shared/validation/validator.ts
- tests/fixtures/generated/saucedemo/specs/login.spec.ts
- tests/fixtures/generated/uitestingplayground/specs/text-input.spec.ts
- tests/framework/evidence-import.spec.ts
- tests/framework/execution-feedback.spec.ts
- tests/framework/origin-guard.spec.ts
- tests/framework/playwright-report.spec.ts
- tests/framework/promotion.spec.ts
- tests/framework/review-contract.spec.ts
- tests/framework/terminal-report.spec.ts
- tests/framework/testcase-export.spec.ts

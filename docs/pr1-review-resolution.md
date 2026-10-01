# PR 1 review resolution

Review fixes were implemented and tested on Windows on 2026-09-30 (America/New_York). No paid OpenAI calls were made. PR remains unmerged.

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

## Commands and results

| Command                                         | Result                                                             |
| ----------------------------------------------- | ------------------------------------------------------------------ |
| npm run typecheck                               | Passed                                                             |
| npm run test:framework                          | 45 passed                                                          |
| npm run test:saucedemo                          | 5 passed                                                           |
| npm run typecheck:generated                     | Passed                                                             |
| npm run test:generated:list                     | 106 discovered                                                     |
| npm run test:generated -- --reporter=line       | 101 passed, 5 failed in experimental legacy accessibility cases    |
| npm run test:generated -- --grep 'TC_INV_005    | TC_INV_006' --repeat-each=5 --reporter=line                        | 10 passed after rendering synchronization fix |
| npm run pipeline:saucedemo:no-ai                | Passed; promoted a new immutable version and replaced current.json |
| npm run pipeline:uitestingplayground -- --no-ai | Passed; promoted                                                   |
| npm run format:check                            | Passed                                                             |
| git diff --check                                | Passed                                                             |

The generated SauceDemo acceptance login passed in the full suite and in the certified pipeline. The framework tests use fixtures, mocked model output and local HTTP servers. Demo-site browser tests depend on external availability.

Latest local successful run evidence:

- generated/runs/saucedemo-2026-10-01T02-52-19-802Z-4c7413cb
- generated/runs/uitestingplayground-2026-10-01T02-52-26-225Z-0222a8ba

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
- docs/data-contracts.md
- docs/generated-code-quality-gates.md
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

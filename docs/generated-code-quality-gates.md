# Generated code quality gates

1. Parse model JSON and validate with Zod.
2. Confine flat filenames and write a fresh staging directory.
3. Audit imports, test controls, ambiguous URL assertions, unsafe capabilities, and assertion presence.
4. Compile the complete batch with TypeScript strict settings.
5. Run Playwright discovery in the batch, requiring actual discovered tests.
6. Execute without retries, require passing non-skipped tests, preserve reports/traces.
7. Compare code hashes before/after validation and again at promotion.
8. Require approved cases and all passing gates before publishing a version.

`tsconfig.generated.json` covers committed fixtures and legacy generated artifacts. Runtime runs are compiled independently by the validator, so an old failed run cannot break an unrelated new batch.

`playwright.generated.config.ts` has explicit fixture/legacy projects for developer use and a selected staging project for pipeline validation. CI executes the approved login fixture; the legacy suite remains experimental.

A passing compiler cannot prove correct business assertions. Review generated test intent against the approved case.

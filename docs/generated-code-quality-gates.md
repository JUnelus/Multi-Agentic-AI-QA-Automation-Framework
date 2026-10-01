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

## Certification contract

Every approved ID maps to exactly one title of the form `[CASE-1] descriptive title`. Static TypeScript AST analysis resolves direct local helpers and explicitly constructed page-object methods. Comments, strings, unused methods and other tests cannot supply an assertion. A trusted reporter also requires a completed successful Playwright expect step in each test body; assertions in hooks and unreachable code do not certify it. Complex unresolved helper patterns are rejected conservatively.

Staged tests import `test` from `multi-agentic-ai-qa-automation-framework/generated-test`. The fixture guards browser requests (including redirected resources via Chromium CDP), browser fetch/XHR, and the provided API request contexts. Every HTTP(S) origin must equal the selected base origin or an explicit `exploration.allowedOrigins` entry. Same-origin absolute URLs are allowed. Static analysis also rejects obvious external navigation/API calls and direct Node networking. Service workers are blocked; additional pages, WebSockets, new contexts and routing overrides are unsupported. This is defense in depth, not a hostile-code sandbox.

The checked-in allowlists include SauceDemo's Google Fonts and Backtrace dependencies, and Playground's Bootstrap, jQuery, Cloudflare and GitHub Buttons resources. Adding an origin explicitly trusts network access to it; no wildcard or blanket static-resource exception exists. New site dependencies fail clearly until reviewed. The experimental legacy project predates this contract and is not certified or promoted by the pipeline.

Execution is serial, with 30 seconds per approved test plus 30 seconds startup, a 60-second minimum, and a 15-minute maximum. The process gets a further 30 seconds to finish reporting. Oversized batches are rejected with a split-batch diagnostic. Effective budgets are recorded in gate diagnostics. Initial, repaired and final certification reports must be terminal; unexpected pending reports are framework errors.

Capability checks apply to member access and destructuring, not only direct calls. Bound aliases and computed context factories are rejected; dynamic computed member access is conservatively unsupported. A runtime factory guard also disables creating new browser contexts/pages during generated tests. Timeout overrides such as test.slow are rejected so the per-case budget remains meaningful.

The manual workflow reserves 120 minutes for up to four bounded validation attempts, two model generations with retries, installation, exploration and artifact upload. The ordinary fixture CI retains its shorter job limit. Infrastructure failures before validation retain ENVIRONMENT_ERROR in the persisted run report.

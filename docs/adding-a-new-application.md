# Adding an application

1. Create `apps/<app-id>/config.json` matching the AppConfig schema. Use a lowercase slug.
2. Set base URL, focus areas and conservative exploration limits/routes. Additional navigation origins must be explicitly configured.
3. Add an app-specific curated Playwright project; bind both testDir and baseURL.
4. Run `npx tsx agents/orchestrator.ts --app <app-id> --explore-only` and review evidence.
5. Generate draft cases with optional `--requirements FILE`, then review and approve JSON.
6. Generate and validate with `--cases FILE --exploration ORIGINAL_EXPLORATION_JSON`, preserving its sibling screenshots and supplying `--requirements FILE` for requirement-backed cases.
7. For no-AI support, add `tests/fixtures/<app-id>-test-cases.json` and `tests/fixtures/generated/<app-id>/{specs,page-objects}`.
8. Verify compilation, discovery and one stable execution baseline.

Do not copy SauceDemo credentials or selectors into another app. The orchestrator and generated validator load app configuration dynamically. Add a package script and manual-workflow app choice if desired.

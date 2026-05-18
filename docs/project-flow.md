# Project Flow

1. Set the target application with `TARGET_APP` in your environment.
2. Agent 1 reads the target app config and prompt template, then generates structured QA test cases.
3. The generated test cases are exported to an Excel workbook under the app's `test-cases` folder.
4. Agent 2 reads the Excel workbook, filters automation-ready cases, and sends them to OpenAI for Playwright code generation.
5. Generated specs and page objects are written to `generated/specs/<app>` and `generated/page-objects/<app>`.
6. Curated Playwright tests under `apps/<app>/tests` can be executed locally or in GitHub Actions.


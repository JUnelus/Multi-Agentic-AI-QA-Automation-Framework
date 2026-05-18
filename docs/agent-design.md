# Agent Design

## Agent 1: Test Case Creator

- Loads the selected application config.
- Builds a prompt from `agents/prompts/testcase-creator.prompt.md`.
- Requests structured JSON test cases from OpenAI.
- Writes the output into an Excel workbook using ExcelJS.

## Agent 2: Script Generator

- Reads the Excel workbook produced by Agent 1.
- Filters for automation-ready scenarios.
- Sends the filtered scenarios to OpenAI with the script generation prompt.
- Writes generated Playwright page objects and specs to the `generated` directory.

## Supporting Utilities

- `shared/utils/app-config.ts` centralizes app configuration loading.
- `shared/utils/openai-client.ts` configures the OpenAI Node SDK from environment variables.
- `shared/utils/json-response.ts` normalizes JSON responses from model output.


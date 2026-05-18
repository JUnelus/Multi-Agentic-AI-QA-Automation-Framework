# Multi-Agentic AI QA Automation Framework

A scalable multi-agent AI QA automation framework that converts application URLs into structured manual test cases and Playwright TypeScript automation.

## Current Target Applications

- SauceDemo
- UI Testing Playground planned

## Agent Workflow

1. Agent 1 analyzes the target application and generates QA test cases.
2. Test cases are exported to Excel.
3. Agent 2 reads the Excel file and filters automation-ready scenarios.
4. Agent 2 generates Playwright TypeScript scripts and Page Object Model classes.
5. Tests run locally and in GitHub Actions.

## Tech Stack

- Playwright
- TypeScript
- OpenAI API
- ExcelJS
- Page Object Model
- GitHub Actions

## Project Structure

```text
multi-agentic-ai-qa-automation-framework/
├── agents/
│   ├── agent1-testcase-creator.ts
│   ├── agent2-script-generator.ts
│   └── prompts/
├── apps/
│   ├── saucedemo/
│   │   ├── config.json
│   │   ├── pages/
│   │   ├── tests/
│   │   └── test-cases/
│   └── uitestingplayground/
│       ├── config.json
│       ├── pages/
│       ├── tests/
│       └── test-cases/
├── shared/
│   ├── fixtures/
│   ├── utils/
│   ├── reporting/
│   └── accessibility/
├── generated/
│   ├── excel/
│   ├── specs/
│   └── page-objects/
├── docs/
├── .github/workflows/
├── playwright.config.ts
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

## Environment Setup

Create a local `.env` file based on `.env.example`:

```env
OPENAI_API_KEY=your_real_key_here
OPENAI_MODEL=gpt-5.5
TARGET_APP=saucedemo
```

`.env` is already ignored by git.

## Run the Project

```bash
npm install
npx playwright install chromium
npm run test:saucedemo
```

## Run the AI Agents

```bash
npm run agent:generate-testcases
npm run agent:generate-scripts
npm run agent:run
```

## Reports

```bash
npm run test:report
```

## First Milestone

Get this working first:

```bash
npm run test:saucedemo
```

Then run:

```bash
npm run agent:generate-testcases
```

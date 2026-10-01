import fs from 'node:fs';
import { AppConfig, loadAppConfig } from '../shared/utils/app-config';
import { generatedCodeSchema } from '../shared/schemas/generated-code.schema';
import { parseJsonResponse } from '../shared/utils/json-response';
import { generateWithOpenAI, Model } from '../shared/utils/openai-client';
import { readTestCases, selectTestCases } from '../shared/utils/testcases';
import { TestCase } from '../shared/schemas/test-case.schema';
export async function generateScripts(
  config: AppConfig,
  cases: TestCase[],
  model: Model = generateWithOpenAI,
  allowDrafts = false
) {
  const selected = selectTestCases(cases, allowDrafts);
  const template = fs.readFileSync(
    'agents/prompts/script-generator.prompt.md',
    'utf8'
  );
  const dependencies = Object.keys(
    JSON.parse(fs.readFileSync('package.json', 'utf8')).dependencies
  ).filter((name) =>
    ['@playwright/test', '@axe-core/playwright'].includes(name)
  );
  const response = await model(
    template +
      '\nInput:\n' +
      JSON.stringify({
        app: { appName: config.appName, baseUrl: config.baseUrl },
        dependencies,
        demoDrafts: allowDrafts,
        testCases: selected
      })
  );
  return {
    code: parseJsonResponse(response.text, generatedCodeSchema),
    usage: response.usage
  };
}
if (require.main === module) {
  const input = process.argv[2];
  if (!input) {
    console.error(
      'Usage: agent:generate-scripts <test-cases.json> [--demo-approve-drafts]'
    );
    process.exitCode = 1;
  } else
    generateScripts(
      loadAppConfig(process.env.TARGET_APP || 'saucedemo'),
      readTestCases(input),
      undefined,
      process.argv.includes('--demo-approve-drafts')
    )
      .then((result) => {
        fs.writeFileSync(
          input + '.automation.json',
          JSON.stringify(result.code, null, 2)
        );
      })
      .catch(() => {
        console.error(
          'Agent 2 failed. Check approved JSON cases and response schema.'
        );
        process.exitCode = 1;
      });
}

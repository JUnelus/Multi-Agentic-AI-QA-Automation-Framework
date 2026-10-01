import fs from 'node:fs';
import path from 'node:path';
import { AppConfig, loadAppConfig } from '../shared/utils/app-config';
import { testCasesSchema } from '../shared/schemas/test-case.schema';
import { parseJsonResponse } from '../shared/utils/json-response';
import { generateWithOpenAI, Model } from '../shared/utils/openai-client';
import { exportTestCases } from '../shared/utils/testcases';
export async function createTestCases(config: AppConfig, model: Model = generateWithOpenAI, context: unknown = {}) {
  const template = fs.readFileSync('agents/prompts/testcase-creator.prompt.md', 'utf8');
  const response = await model(template + '\nInput:\n' + JSON.stringify({ app: { appName: config.appName, baseUrl: config.baseUrl, testFocusAreas: config.testFocusAreas }, context }));
  const cases = parseJsonResponse(response.text, testCasesSchema).map(c => ({ ...c, reviewStatus: 'draft' as const }));
  return { cases, usage: response.usage };
}
if (require.main === module) {
  const app = process.env.TARGET_APP || 'saucedemo';
  createTestCases(loadAppConfig(app)).then(result => exportTestCases(result.cases, path.join('generated', 'runs', app + '-' + Date.now()))).catch(() => { console.error('Agent 1 failed. Check configuration and response schema.'); process.exitCode = 1; });
}


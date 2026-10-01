import {
  validateProvenance,
  contentHash,
  readExploration,
  evidenceHash,
  validateExploration
} from '../shared/exploration/evidence';
import fs from 'node:fs';
import path from 'node:path';
import { AppConfig, loadAppConfig } from '../shared/utils/app-config';
import { testCasesSchema } from '../shared/schemas/test-case.schema';
import { parseJsonResponse } from '../shared/utils/json-response';
import { generateWithOpenAI, Model } from '../shared/utils/openai-client';
import { exportTestCases } from '../shared/utils/testcases';
import { Exploration } from '../shared/schemas/explorer.schema';
import { z } from 'zod';
export async function createTestCases(
  config: AppConfig,
  exploration: Exploration,
  model: Model = generateWithOpenAI,
  requirements?: string
) {
  validateExploration(exploration, exploration.app, config);
  const template = fs.readFileSync(
    'agents/prompts/testcase-creator.prompt.md',
    'utf8'
  );
  const response = await model(
    template +
      '\nSchema:\n' +
      JSON.stringify(z.toJSONSchema(testCasesSchema)) +
      '\nInput:\n' +
      JSON.stringify({
        app: {
          appName: config.appName,
          baseUrl: config.baseUrl,
          testFocusAreas: config.testFocusAreas
        },
        exploration,
        requirements
      })
  );
  const cases = parseJsonResponse(response.text, testCasesSchema).map((c) => ({
    ...c,
    reviewStatus: 'draft' as const,
    application: exploration.app,
    explorationHash: evidenceHash(exploration),
    requirementsHash: requirements ? contentHash(requirements) : undefined
  }));
  validateProvenance(cases, exploration, {
    app: exploration.app,
    config,
    requirements,
    generated: true
  });
  return { cases, usage: response.usage };
}
if (require.main === module) {
  const app = process.env.TARGET_APP || 'saucedemo';
  const input = process.argv[2];
  if (!input) {
    console.error('Usage: agent:generate-testcases <exploration.json>');
    process.exitCode = 1;
  } else
    createTestCases(
      loadAppConfig(app),
      readExploration(input, app, loadAppConfig(app))
    )
      .then((result) => exportTestCases(result.cases, path.dirname(input)))
      .catch(() => {
        console.error(
          'Agent 1 failed. Check configuration and response schema.'
        );
        process.exitCode = 1;
      });
}

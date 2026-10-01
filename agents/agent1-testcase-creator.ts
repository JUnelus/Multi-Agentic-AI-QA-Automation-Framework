import fs from 'node:fs';
import path from 'node:path';
import { AppConfig, loadAppConfig } from '../shared/utils/app-config';
import { testCasesSchema } from '../shared/schemas/test-case.schema';
import { parseJsonResponse } from '../shared/utils/json-response';
import { generateWithOpenAI, Model } from '../shared/utils/openai-client';
import { exportTestCases } from '../shared/utils/testcases';
import { Exploration, explorationSchema } from '../shared/schemas/explorer.schema';
import { z } from 'zod';
export async function createTestCases(config: AppConfig, exploration: Exploration, model: Model = generateWithOpenAI, requirements?: string) {
  explorationSchema.parse(exploration);
  const template = fs.readFileSync('agents/prompts/testcase-creator.prompt.md', 'utf8');
  const response = await model(template + '\nSchema:\n' + JSON.stringify(z.toJSONSchema(testCasesSchema)) + '\nInput:\n' + JSON.stringify({ app: { appName: config.appName, baseUrl: config.baseUrl, testFocusAreas: config.testFocusAreas }, exploration, requirements }));
  const cases = parseJsonResponse(response.text, testCasesSchema).map(c => ({ ...c, reviewStatus: 'draft' as const }));
  const evidence = new Map(exploration.pages.flatMap(p => p.elements.map(e => [e.evidenceId, e] as const)));
  for (const c of cases) {
    if (!c.evidenceIds || !c.requirementSource || c.confidence === undefined || !c.expectedBehaviorSource) throw new Error('Missing behavior provenance');
    if (c.expectedBehaviorSource === 'approved-baseline' || (c.expectedBehaviorSource === 'requirement' && !requirements)) throw new Error('Unsupported behavior provenance');
    if (c.expectedBehaviorSource === 'observed' && !c.evidenceIds.length) throw new Error('Observed behavior requires evidence');
    for (const id of c.evidenceIds) if (!evidence.has(id) && !exploration.pages.some(p => p.id === id)) throw new Error('Unknown evidence ID');
    for (const item of c.selectorEvidence || []) if (evidence.get(item.evidenceId)?.selector !== item.selector) throw new Error('Selector lacks observed evidence');
  }
  return { cases, usage: response.usage };
}
if (require.main === module) {
  const app = process.env.TARGET_APP || 'saucedemo';
  const input = process.argv[2];
  if (!input) { console.error('Usage: agent:generate-testcases <exploration.json>'); process.exitCode = 1; }
  else createTestCases(loadAppConfig(app), explorationSchema.parse(JSON.parse(fs.readFileSync(input, 'utf8')))).then(result => exportTestCases(result.cases, path.dirname(input))).catch(() => { console.error('Agent 1 failed. Check configuration and response schema.'); process.exitCode = 1; });
}

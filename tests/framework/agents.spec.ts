import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTestCases } from '../../agents/agent1-testcase-creator';
import { generateScripts } from '../../agents/agent2-script-generator';
import { loadAppConfig } from '../../shared/utils/app-config';
import { readTestCases } from '../../shared/utils/testcases';
import { explorationSchema } from '../../shared/schemas/explorer.schema';
const config = loadAppConfig('saucedemo');
const evidence = explorationSchema.parse({
  schemaVersion: '1.0',
  app: 'saucedemo',
  url: config.baseUrl,
  pages: [
    {
      id: 'PAGE-001',
      url: config.baseUrl,
      title: 'Login',
      headings: [],
      screenshot: 'screenshots/PAGE-001.png',
      elements: [
        {
          evidenceId: 'OBS-1',
          tag: 'input',
          role: 'textbox',
          accessibleName: 'Username',
          selector: '#username',
          visible: true
        }
      ]
    }
  ],
  limits: {
    pagesVisited: 1,
    interactions: 0,
    durationMs: 1,
    stoppedBy: 'complete'
  }
});
const baseline = readTestCases('tests/fixtures/saucedemo-test-cases.json')[0];
test('Agent 1 receives evidence and cannot grant approval', async () => {
  const result = await createTestCases(config, evidence, async (prompt) => {
    assert.ok(prompt.includes('OBS-1'));
    assert.ok(prompt.includes('testFocusAreas'));
    return {
      text: JSON.stringify([
        { ...baseline, expectedBehaviorSource: 'inferred' }
      ])
    };
  });
  assert.equal(result.cases[0].reviewStatus, 'draft');
});
test('Agent 1 rejects invented selectors, IDs and unsupported provenance', async () => {
  for (const patch of [
    { selectorEvidence: [{ evidenceId: 'OBS-1', selector: '#invented' }] },
    { evidenceIds: ['missing'] },
    { expectedBehaviorSource: 'requirement' },
    { confidence: undefined },
    { expectedBehaviorSource: 'observed', evidenceIds: [] }
  ]) {
    await assert.rejects(() =>
      createTestCases(config, evidence, async () => ({
        text: JSON.stringify([
          { ...baseline, expectedBehaviorSource: 'inferred', ...patch }
        ])
      }))
    );
  }
});
test('Agent 2 blocks draft input before making any model call', async () => {
  let called = false;
  await assert.rejects(
    () =>
      generateScripts(
        config,
        [{ ...baseline, reviewStatus: 'draft' }],
        async () => {
          called = true;
          return { text: '{}' };
        }
      ),
    /No approved/
  );
  assert.equal(called, false);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pipeline, parseOptions } from '../../agents/orchestrator';
import { readTestCases } from '../../shared/utils/testcases';
test('CLI rejects empty file options and incompatible modes', async () => {
  assert.throws(() => parseOptions(['--cases', '']), /cannot be empty/);
  assert.throws(() => parseOptions(['--unknown']), /Unknown/);
  await assert.rejects(
    () => pipeline({ app: 'saucedemo', exploreOnly: true, validateOnly: true }),
    /Only one/
  );
  await assert.rejects(
    () => pipeline({ app: 'saucedemo', validateOnly: true }),
    /requires/
  );
  await assert.rejects(
    () => pipeline({ app: 'saucedemo', maxRepairs: 4 }),
    /0..3/
  );
});
test('fixture generation cannot certify modified expected results', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-input-'));
  try {
    const cases = readTestCases('tests/fixtures/saucedemo-test-cases.json');
    cases[0].expectedResult = 'Contradictory requirement';
    const file = path.join(directory, 'cases.json');
    fs.writeFileSync(file, JSON.stringify(cases));
    await assert.rejects(
      () => pipeline({ app: 'saucedemo', noAi: true, casesFile: file }),
      /committed baseline/
    );
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

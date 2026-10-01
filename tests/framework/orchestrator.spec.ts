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

test('pre-validation filesystem failure persists an environment diagnosis', async () => {
  const root = path.resolve('generated/runs');
  fs.mkdirSync(root, { recursive: true });
  const before = new Set(fs.readdirSync(root));
  try {
    await assert.rejects(
      () =>
        pipeline({
          app: 'saucedemo',
          noAi: true,
          requirementsFile: path.join(
            os.tmpdir(),
            'qa-missing-' + Date.now() + '.txt'
          )
        }),
      /ENOENT/
    );
    const created = fs.readdirSync(root).filter((name) => !before.has(name));
    assert.equal(created.length, 1);
    const report = JSON.parse(
      fs.readFileSync(
        path.join(root, created[0], 'validation-report.json'),
        'utf8'
      )
    );
    assert.equal(report.finalResult, 'failed');
    assert.equal(report.category, 'ENVIRONMENT_ERROR');
    assert.match(report.schema.diagnostics, /ENOENT/);
  } finally {
    for (const name of fs
      .readdirSync(root)
      .filter((name) => !before.has(name))) {
      const target = path.resolve(root, name);
      assert.equal(path.dirname(target), root);
      fs.rmSync(target, { recursive: true, force: true });
    }
  }
});

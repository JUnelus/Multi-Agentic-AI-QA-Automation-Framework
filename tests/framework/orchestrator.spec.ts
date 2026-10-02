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
  // Inputs must live inside the checkout; this ignored directory keeps the test hermetic.
  const directory = fs.mkdtempSync(
    path.resolve('generated', 'contract-test-input-')
  );
  try {
    const cases = readTestCases('tests/fixtures/saucedemo-test-cases.json');
    cases[0].expectedResult = 'Contradictory requirement';
    const file = path.join(directory, 'cases.json');
    fs.writeFileSync(file, JSON.stringify(cases));
    await assert.rejects(
      () =>
        pipeline({
          app: 'saucedemo',
          noAi: true,
          casesFile: path.relative(process.cwd(), file)
        }),
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
          requirementsFile:
            'generated/contract-test-missing-' + Date.now() + '.txt'
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

test('operator inputs outside the checkout are rejected before being read or persisted', async () => {
  const root = path.resolve('generated/runs');
  fs.mkdirSync(root, { recursive: true });
  const before = new Set(fs.readdirSync(root));
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-outside-'));
  try {
    const secret = path.join(outside, 'requirements.txt');
    fs.writeFileSync(secret, 'OPENAI_API_KEY=should-never-be-copied');
    const cases = path.join(outside, 'cases.json');
    fs.copyFileSync('tests/fixtures/saucedemo-test-cases.json', cases);
    for (const requirementsFile of [secret, '/proc/self/environ'])
      await assert.rejects(
        () => pipeline({ app: 'saucedemo', noAi: true, requirementsFile }),
        /inside the checkout/
      );
    await assert.rejects(
      () => pipeline({ app: 'saucedemo', noAi: true, casesFile: cases }),
      /inside the checkout/
    );
    const created = fs.readdirSync(root).filter((name) => !before.has(name));
    assert.equal(created.length, 2);
    for (const name of created) {
      const files = fs.readdirSync(path.join(root, name));
      assert.ok(!files.includes('requirements.txt'), files.join(','));
      const manifest = JSON.parse(
        fs.readFileSync(path.join(root, name, 'manifest.json'), 'utf8')
      );
      assert.equal(manifest.artifacts.requirements, undefined);
      assert.equal(manifest.validation.finalResult, 'failed');
    }
  } finally {
    fs.rmSync(outside, { recursive: true, force: true });
    for (const name of fs
      .readdirSync(root)
      .filter((name) => !before.has(name))) {
      const target = path.resolve(root, name);
      assert.equal(path.dirname(target), root);
      fs.rmSync(target, { recursive: true, force: true });
    }
  }
});

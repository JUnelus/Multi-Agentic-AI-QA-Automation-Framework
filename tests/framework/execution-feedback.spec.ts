import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { readCode } from '../../shared/validation/code-contract';
import { stageCode } from '../../shared/utils/safe-path';
import { validateCode } from '../../shared/validation/validator';
import { repairLoop } from '../../shared/validation/repair';
import { readTestCases } from '../../shared/utils/testcases';
test('actual execution contradiction is preserved as a defect candidate without repair', async () => {
  const directory = fs.mkdtempSync(
    path.join(process.cwd(), 'generated', 'contract-test-')
  );
  try {
    const code = {
      pageObjects: [
        {
          fileName: 'HeadingPage.ts',
          code: `import { Page, expect } from '@playwright/test';
export class HeadingPage {
  constructor(private page: Page) {}
  async check() {
    await this.page.setContent('<h1>Actual behavior</h1>');
    await expect(this.page.getByRole('heading')).toHaveText('Approved behavior', { timeout: 100 });
  }
}`
        }
      ],
      specFiles: [
        {
          fileName: 'heading.spec.ts',
          code: `import { test } from 'multi-agentic-ai-qa-automation-framework/generated-test';
import { HeadingPage } from '../page-objects/HeadingPage';
test('[TC_LOGIN_001] approved behavior', async ({ page }) => { await new HeadingPage(page).check(); });`
        }
      ]
    };
    const staging = path.join(directory, 'staging');
    stageCode(code, staging);
    const result = await repairLoop({
      code,
      directory: staging,
      runDirectory: directory,
      validate: (_code, dir, attempt) =>
        validateCode(
          'defect-fixture',
          'saucedemo',
          dir,
          path.join(directory, 'reports', String(attempt)),
          readTestCases('tests/fixtures/saucedemo-test-cases.json')
        )
    });
    assert.equal(result.report.typecheck.status, 'passed');
    assert.equal(result.report.discovery.status, 'passed');
    assert.equal(result.report.execution.status, 'failed');
    assert.equal(result.report.category, 'POSSIBLE_PRODUCT_DEFECT');
    assert.equal(result.report.repairAttempts, 0);
    assert.equal(result.report.defectCandidates.length, 1);
    assert.deepEqual(readCode(staging), code);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
test('malformed generated directory becomes a schema report, not an uncaught error', async () => {
  const directory = fs.mkdtempSync(
    path.join(process.cwd(), 'generated', 'contract-test-')
  );
  try {
    const report = await validateCode(
      'bad-code',
      'saucedemo',
      directory,
      path.join(directory, 'reports')
    );
    assert.equal(report.schema.status, 'failed');
    assert.equal(report.execution.status, 'not-run');
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('syntactically present but unexecuted assertions cannot certify a case', async () => {
  const directory = fs.mkdtempSync(
    path.join(process.cwd(), 'generated', 'contract-test-')
  );
  try {
    const code = readCode('tests/fixtures/generated/saucedemo');
    code.specFiles[0].code = `import {test,expect} from 'multi-agentic-ai-qa-automation-framework/generated-test';
  test('[TC_LOGIN_001] dead assertion',async()=>{if(false) {expect(1).toBe(1);}});`;
    const staging = path.join(directory, 'staging');
    stageCode(code, staging);
    const report = await validateCode(
      'empty-runtime',
      'saucedemo',
      staging,
      path.join(directory, 'reports'),
      readTestCases('tests/fixtures/saucedemo-test-cases.json')
    );
    assert.equal(report.schema.status, 'passed');
    assert.equal(report.typecheck.status, 'passed');
    assert.equal(report.discovery.status, 'passed');
    assert.equal(report.execution.status, 'failed');
    assert.match(
      report.execution.diagnostics,
      /execute at least one successful assertion/
    );
    assert.equal(report.finalResult, 'failed');
    assert.equal(report.category, 'GENERATOR_ERROR');
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('suite hooks recovered through object enumeration fail discovery with a generator error', async () => {
  const directory = fs.mkdtempSync(
    path.join(process.cwd(), 'generated', 'contract-test-')
  );
  try {
    const code = readCode('tests/fixtures/generated/saucedemo');
    code.specFiles[0].code = `import {test,expect} from 'multi-agentic-ai-qa-automation-framework/generated-test';
  const setup = Object.entries(test).filter(([k]) => k === 'before' + 'All')[0][1];
  setup(async () => { await new Promise(() => {}); });
  test('[TC_LOGIN_001] enumeration bypass',async({page})=>{await page.goto('/');await expect(page).toHaveURL(/./);});`;
    const staging = path.join(directory, 'staging');
    stageCode(code, staging);
    const report = await validateCode(
      'enumerated-hook',
      'saucedemo',
      staging,
      path.join(directory, 'reports'),
      readTestCases('tests/fixtures/saucedemo-test-cases.json')
    );
    assert.equal(report.schema.status, 'passed');
    assert.equal(report.typecheck.status, 'passed');
    assert.equal(report.discovery.status, 'failed');
    assert.match(report.discovery.diagnostics, /cannot use test\.beforeAll/);
    assert.equal(report.execution.status, 'not-run');
    assert.equal(report.finalResult, 'failed');
    assert.equal(report.category, 'GENERATOR_ERROR');
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('suite hooks on a test object derived through recovered extend fail discovery', async () => {
  const directory = fs.mkdtempSync(
    path.join(process.cwd(), 'generated', 'contract-test-')
  );
  try {
    const code = readCode('tests/fixtures/generated/saucedemo');
    code.specFiles[0].code = `import {test,expect} from 'multi-agentic-ai-qa-automation-framework/generated-test';
  const derive = Object.entries(test).filter(([k]) => k === 'ex' + 'tend')[0][1];
  const derived: typeof test = derive({});
  Object.entries(derived).filter(([k]) => k === 'before' + 'All')[0][1](async () => { await new Promise(() => {}); });
  test('[TC_LOGIN_001] derived hook bypass',async({page})=>{await page.goto('/');await expect(page).toHaveURL(/./);});`;
    const staging = path.join(directory, 'staging');
    stageCode(code, staging);
    const report = await validateCode(
      'derived-hook',
      'saucedemo',
      staging,
      path.join(directory, 'reports'),
      readTestCases('tests/fixtures/saucedemo-test-cases.json')
    );
    assert.equal(report.schema.status, 'passed');
    assert.equal(report.typecheck.status, 'passed');
    assert.equal(report.discovery.status, 'failed');
    assert.match(report.discovery.diagnostics, /cannot use test\.extend/);
    assert.equal(report.execution.status, 'not-run');
    assert.equal(report.finalResult, 'failed');
    assert.equal(report.category, 'GENERATOR_ERROR');
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

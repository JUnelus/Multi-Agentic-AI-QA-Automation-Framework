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
          code: `import { test } from '@playwright/test';
import { HeadingPage } from '../page-objects/HeadingPage';
test('TC_LOGIN_001 approved behavior', async ({ page }) => { await new HeadingPage(page).check(); });`
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

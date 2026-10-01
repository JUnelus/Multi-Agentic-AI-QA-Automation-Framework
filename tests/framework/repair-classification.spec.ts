import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { classifyFailure } from '../../shared/validation/classify';
import { repairImports, repairLoop } from '../../shared/validation/repair';
import { emptyReport } from '../../shared/validation/validator';
test('compiler, selector, environment and assertion failures classified conservatively', () => {
  assert.equal(
    classifyFailure('typecheck', 'TS2307 Cannot find module'),
    'IMPORT_ERROR'
  );
  assert.equal(
    classifyFailure('typecheck', 'TS2339 Property does not exist on type'),
    'PAGE_OBJECT_CONTRACT_ERROR'
  );
  assert.equal(
    classifyFailure('execution', 'locator.click: waiting for locator'),
    'SELECTOR_ERROR'
  );
  assert.equal(
    classifyFailure(
      'execution',
      'expect(locator).toHaveText Expected: Inventory Received: Error'
    ),
    'POSSIBLE_PRODUCT_DEFECT'
  );
  assert.equal(
    classifyFailure('execution', 'net::ERR_NAME_NOT_RESOLVED'),
    'ENVIRONMENT_ERROR'
  );
});
const code = {
  pageObjects: [{ fileName: 'Login.ts', code: 'export class Login {}' }],
  specFiles: [
    {
      fileName: 'login.spec.ts',
      code: 'import { Login } from "../pageObjects/Login";\nexpect(value).toBe("approved");'
    }
  ]
};
test('repair changes imports only and preserves assertion body', () => {
  const result = repairImports(code)!;
  assert.ok(result.specFiles[0].code.includes('../page-objects/Login'));
  assert.equal(
    result.specFiles[0].code.split('\n')[1],
    code.specFiles[0].code.split('\n')[1]
  );
});
test('bounded loop preserves product defects and max-repairs=0', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-repair-'));
  try {
    let calls = 0;
    const result = await repairLoop({
      code,
      directory,
      runDirectory: directory,
      validate: async () => {
        calls++;
        return {
          ...emptyReport('run'),
          finalResult: 'failed',
          category: 'POSSIBLE_PRODUCT_DEFECT'
        };
      }
    });
    assert.equal(calls, 1);
    assert.equal(result.report.repairAttempts, 0);
    const zero = await repairLoop({
      code,
      directory,
      runDirectory: directory,
      maxRepairs: 0,
      validate: async () => ({
        ...emptyReport('run'),
        finalResult: 'failed',
        category: 'IMPORT_ERROR'
      })
    });
    assert.equal(zero.report.repairAttempts, 0);
    await assert.rejects(() =>
      repairLoop({
        code,
        directory,
        runDirectory: directory,
        maxRepairs: 4,
        validate: async () => emptyReport('run')
      })
    );
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { repairLoop } from '../../shared/validation/repair';
import { emptyReport } from '../../shared/validation/validator';
import { readCode } from '../../shared/validation/code-contract';
test('initial and repaired pending reports cannot certify a run', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-terminal-'));
  try {
    const code = readCode('tests/fixtures/generated/saucedemo');
    code.specFiles[0].code = code.specFiles[0].code.replace(
      '../page-objects/',
      '../pageObjects/'
    );
    for (const pendingAttempt of [0, 1])
      await assert.rejects(
        () =>
          repairLoop({
            code,
            directory: root,
            runDirectory: root,
            validate: async (_c, _d, attempt) => ({
              ...emptyReport('pending'),
              finalResult: attempt === pendingAttempt ? 'pending' : 'failed',
              category: 'IMPORT_ERROR'
            })
          }),
        /nonterminal|pending/i
      );
    for (const finalResult of ['passed', 'failed'] as const) {
      const result = await repairLoop({
        code,
        directory: root,
        runDirectory: root,
        maxRepairs: 0,
        validate: async () => ({ ...emptyReport('terminal'), finalResult })
      });
      assert.equal(result.report.finalResult, finalResult);
    }
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

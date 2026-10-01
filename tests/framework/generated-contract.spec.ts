import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { auditCode, readCode, typecheckDirectory } from '../../shared/validation/code-contract';
import { stageCode } from '../../shared/utils/safe-path';
import { repairLoop } from '../../shared/validation/repair';
import { emptyReport } from '../../shared/validation/validator';
const fixture = () => readCode('tests/fixtures/generated/saucedemo');
test('known-good generated fixture compiles and passes static contract', () => {
  assert.deepEqual(typecheckDirectory('tests/fixtures/generated/saucedemo'), []);
  assert.deepEqual(auditCode(fixture()), []);
});
test('unsupported dependencies, ambiguous assertions and test suppression rejected', () => {
  for (const text of ['import X from "missing-library";', 'expect(page).toHaveURL(/cart|checkout/);', 'test.skip("case");', 'test.fail();', 'process.env.OPENAI_API_KEY;', 'try {} catch {}']) {
    const code = fixture(); code.specFiles[0].code += '\n' + text;
    assert.ok(auditCode(code).length > 0, text);
  }
});
test('real compiler detects page-object contract mismatch', () => {
  const directory = fs.mkdtempSync(path.join(process.cwd(), 'generated', 'contract-test-'));
  try {
    const code = fixture(); code.specFiles[0].code = code.specFiles[0].code.replace('login.expectInventory()', 'login.missingMethod()');
    stageCode(code, path.join(directory, 'code'));
    assert.ok(typecheckDirectory(path.join(directory, 'code')).some(e => e.includes('TS2339')));
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});
test('repair records a separate successful attempt and preserves initial failure', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-attempt-'));
  try {
    const code = fixture(); code.specFiles[0].code = code.specFiles[0].code.replace('../page-objects/', '../pageObjects/');
    const result = await repairLoop({ code, directory, runDirectory: directory, validate: async (_code, _dir, attempt) => ({
      ...emptyReport('fixture'), typecheck: { status: attempt ? 'passed' : 'failed', diagnostics: 'fixture', durationMs: 0 },
      finalResult: attempt ? 'passed' : 'failed', category: attempt ? undefined : 'IMPORT_ERROR'
    }) });
    assert.equal(result.report.finalResult, 'passed'); assert.equal(result.report.repairAttempts, 1);
    assert.equal(result.report.initialTypecheck.status, 'failed');
    assert.ok(fs.existsSync(path.join(directory, 'repair/attempt-1/validation-report.json')));
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});


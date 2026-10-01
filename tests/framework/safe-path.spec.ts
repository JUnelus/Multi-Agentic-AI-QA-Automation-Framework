import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { safeDestination, stageCode } from '../../shared/utils/safe-path';
test('flat filenames only, including Windows traversal and encoded injection', () => {
  assert.equal(path.basename(safeDestination('generated/staging', 'Login.ts', 'page')), 'Login.ts');
  for (const name of ['../a.ts', '..\\a.ts', '/a.ts', 'C:\\a.ts', 'nested/a.ts', '%2e%2e.ts', '.a.ts', 'a.js', 'CON.ts', 'a.ts:evil']) assert.throws(() => safeDestination('generated/staging', name, 'page'));
  assert.throws(() => safeDestination('generated/staging', 'a.ts', 'spec'));
});
test('staging rejects duplicate filenames and cannot overwrite a batch', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-stage-'));
  const code = { pageObjects: [{ fileName: 'Login.ts', code: 'export {}' }], specFiles: [{ fileName: 'login.spec.ts', code: 'export {}' }] };
  try {
    assert.throws(() => stageCode({ ...code, pageObjects: [...code.pageObjects, { ...code.pageObjects[0], fileName: 'login.ts' }] }, path.join(dir, 'duplicate')));
    stageCode(code, path.join(dir, 'batch'));
    assert.throws(() => stageCode(code, path.join(dir, 'batch')), /already exists/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

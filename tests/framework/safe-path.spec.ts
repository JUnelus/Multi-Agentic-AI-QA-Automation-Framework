import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  resolveRepositoryInput,
  safeDestination,
  stageCode
} from '../../shared/utils/safe-path';
test('flat filenames only, including Windows traversal and encoded injection', () => {
  assert.equal(
    path.basename(safeDestination('generated/staging', 'Login.ts', 'page')),
    'Login.ts'
  );
  for (const name of [
    '../a.ts',
    '..\\a.ts',
    '/a.ts',
    'C:\\a.ts',
    'nested/a.ts',
    '%2e%2e.ts',
    '.a.ts',
    'a.js',
    'CON.ts',
    'a.ts:evil'
  ])
    assert.throws(() => safeDestination('generated/staging', name, 'page'));
  assert.throws(() => safeDestination('generated/staging', 'a.ts', 'spec'));
});
test('staging rejects duplicate filenames and cannot overwrite a batch', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-stage-'));
  const code = {
    pageObjects: [{ fileName: 'Login.ts', code: 'export {}' }],
    specFiles: [{ fileName: 'login.spec.ts', code: 'export {}' }]
  };
  try {
    assert.throws(() =>
      stageCode(
        {
          ...code,
          pageObjects: [
            ...code.pageObjects,
            { ...code.pageObjects[0], fileName: 'login.ts' }
          ]
        },
        path.join(dir, 'duplicate')
      )
    );
    stageCode(code, path.join(dir, 'batch'));
    assert.throws(
      () => stageCode(code, path.join(dir, 'batch')),
      /already exists/
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
test('operator inputs resolve only to regular files or directories inside the checkout', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-input-root-'));
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-input-outside-'));
  try {
    fs.mkdirSync(path.join(root, 'inputs'));
    fs.writeFileSync(path.join(root, 'inputs', 'cases.json'), '[]');
    fs.writeFileSync(path.join(outside, 'secret.txt'), 'OPENAI_API_KEY=x');
    assert.equal(
      resolveRepositoryInput('inputs/cases.json', 'file', root),
      path.join(root, 'inputs', 'cases.json')
    );
    assert.equal(
      resolveRepositoryInput('inputs', 'directory', root),
      path.join(root, 'inputs')
    );
    for (const input of [
      '',
      '.',
      '../secret.txt',
      'inputs/../../secret.txt',
      path.join(outside, 'secret.txt'),
      '/proc/self/environ'
    ])
      assert.throws(
        () => resolveRepositoryInput(input, 'file', root),
        /inside the checkout|cannot be empty/,
        input
      );
    assert.throws(
      () => resolveRepositoryInput('inputs', 'file', root),
      /regular file/
    );
    assert.throws(
      () => resolveRepositoryInput('inputs/cases.json', 'directory', root),
      /regular directory/
    );
    assert.throws(
      () => resolveRepositoryInput('inputs/missing.json', 'file', root),
      /ENOENT/
    );
    try {
      fs.symlinkSync(outside, path.join(root, 'inputs', 'link'), 'junction');
    } catch {
      return; // Symlink creation is not permitted in this environment.
    }
    assert.throws(
      () => resolveRepositoryInput('inputs/link/secret.txt', 'file', root),
      /Symlink/
    );
    assert.throws(
      () => resolveRepositoryInput('inputs/link', 'directory', root),
      /Symlink/
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
    fs.rmSync(outside, { recursive: true, force: true });
  }
});

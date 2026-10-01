import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRun, hashInput } from '../../shared/utils/run-manifest';
import { stageCode } from '../../shared/utils/safe-path';
import { readCode } from '../../shared/validation/code-contract';
import { artifactHash } from '../../shared/validation/validator';
import { promote } from '../../shared/validation/promotion';
import {
  readTestCases,
  exportTestCases,
  selectTestCases
} from '../../shared/utils/testcases';
test('promotion requires all gates and unchanged code/cases; versions remain immutable', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-promote-'));
  try {
    const { directory, manifest } = createRun('saucedemo', 'fixture', root);
    const staging = path.join(directory, 'staging');
    stageCode(readCode('tests/fixtures/generated/saucedemo'), staging);
    const cases = readTestCases('tests/fixtures/saucedemo-test-cases.json');
    cases.push({ ...cases[0], testCaseId: 'TC_DRAFT', reviewStatus: 'draft' });
    await exportTestCases(cases, directory);
    manifest.inputHashes.testCases = hashInput(cases);
    manifest.inputHashes.selectedCases = hashInput(selectTestCases(cases));
    const approvedRoot = path.join(root, 'approved');
    assert.throws(
      () => promote(staging, directory, manifest, approvedRoot),
      /all quality gates/
    );
    const pass = { status: 'passed' as const, diagnostics: '', durationMs: 1 };
    Object.assign(manifest.validation, {
      schema: pass,
      typecheck: pass,
      discovery: pass,
      execution: pass,
      finalResult: 'passed',
      artifactHash: artifactHash(staging)
    });
    fs.appendFileSync(
      path.join(staging, 'specs/login.spec.ts'),
      '\n// changed'
    );
    assert.throws(
      () => promote(staging, directory, manifest, approvedRoot),
      /changed after validation/
    );
    manifest.validation.artifactHash = artifactHash(staging);
    const version = promote(staging, directory, manifest, approvedRoot);
    assert.ok(fs.existsSync(path.join(version, 'specs/login.spec.ts')));
    assert.equal(
      JSON.parse(
        fs.readFileSync(
          path.join(approvedRoot, 'saucedemo/current.json'),
          'utf8'
        )
      ).runId,
      manifest.runId
    );
    assert.throws(
      () => promote(staging, directory, manifest, approvedRoot),
      /already exists/
    );
    manifest.validation.defectCandidates.push(
      'Approved expectation contradicted'
    );
    assert.throws(
      () => promote(staging, directory, manifest, approvedRoot),
      /all quality gates/
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

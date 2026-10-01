import { writeAtomicJson } from '../../shared/utils/atomic-json';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRun, hashInput, saveRun } from '../../shared/utils/run-manifest';
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

test('two promotions preserve immutable versions, consistent manifests and replace current atomically', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-promote-twice-'));
  try {
    const versions: string[] = [];
    const snapshots: string[] = [];
    for (let index = 0; index < 2; index++) {
      const { directory, manifest } = createRun('saucedemo', 'fixture', root);
      const staging = path.join(directory, 'staging');
      stageCode(readCode('tests/fixtures/generated/saucedemo'), staging);
      const cases = readTestCases('tests/fixtures/saucedemo-test-cases.json');
      await exportTestCases(cases, directory);
      manifest.inputHashes.testCases = hashInput(cases);
      manifest.inputHashes.selectedCases = hashInput(cases);
      const pass = {
        status: 'passed' as const,
        diagnostics: '',
        durationMs: 0
      };
      Object.assign(manifest.validation, {
        schema: pass,
        typecheck: pass,
        discovery: pass,
        execution: pass,
        finalResult: 'passed',
        artifactHash: artifactHash(staging)
      });
      const version = promote(
        staging,
        directory,
        manifest,
        path.join(root, 'approved')
      );
      saveRun(directory, manifest);
      const approved = fs.readFileSync(
        path.join(version, 'manifest.json'),
        'utf8'
      );
      assert.deepEqual(
        JSON.parse(approved),
        JSON.parse(
          fs.readFileSync(path.join(directory, 'manifest.json'), 'utf8')
        )
      );
      assert.equal(JSON.parse(approved).artifacts.approved, version);
      versions.push(version);
      snapshots.push(approved);
      const pointer = JSON.parse(
        fs.readFileSync(
          path.join(root, 'approved/saucedemo/current.json'),
          'utf8'
        )
      );
      assert.equal(pointer.runId, manifest.runId);
    }
    versions.forEach((v, i) =>
      assert.equal(
        fs.readFileSync(path.join(v, 'manifest.json'), 'utf8'),
        snapshots[i]
      )
    );
    assert.equal(
      fs
        .readdirSync(path.join(root, 'approved/saucedemo'))
        .filter((f) => f.endsWith('.tmp')).length,
      0
    );
    const pointer = path.join(root, 'approved/saucedemo/current.json');
    const previous = fs.readFileSync(pointer, 'utf8');
    assert.throws(
      () =>
        writeAtomicJson(pointer, { broken: true }, () => {
          throw new Error('simulated replacement failure');
        }),
      /replacement failure/
    );
    assert.equal(fs.readFileSync(pointer, 'utf8'), previous);
    assert.equal(
      fs.readdirSync(path.dirname(pointer)).filter((f) => f.endsWith('.tmp'))
        .length,
      0
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('a failed promotion leaves no partial version, restores the manifest pointer and can be retried', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-promote-retry-'));
  try {
    const { directory, manifest } = createRun('saucedemo', 'fixture', root);
    const staging = path.join(directory, 'staging');
    stageCode(readCode('tests/fixtures/generated/saucedemo'), staging);
    const cases = readTestCases('tests/fixtures/saucedemo-test-cases.json');
    await exportTestCases(cases, directory);
    manifest.inputHashes.testCases = hashInput(cases);
    manifest.inputHashes.selectedCases = hashInput(cases);
    const pass = { status: 'passed' as const, diagnostics: '', durationMs: 0 };
    Object.assign(manifest.validation, {
      schema: pass,
      typecheck: pass,
      discovery: pass,
      execution: pass,
      finalResult: 'passed',
      artifactHash: artifactHash(staging)
    });
    const approvedRoot = path.join(root, 'approved');
    const appDirectory = path.join(approvedRoot, 'saucedemo');
    const version = path.join(appDirectory, manifest.runId);
    // Failure after the code is staged but before the version is complete.
    const counts = manifest.counts;
    Object.defineProperty(manifest, 'counts', {
      get() {
        throw new Error('simulated manifest serialization failure');
      },
      enumerable: true,
      configurable: true
    });
    assert.throws(
      () => promote(staging, directory, manifest, approvedRoot),
      /serialization failure/
    );
    Object.defineProperty(manifest, 'counts', {
      value: counts,
      writable: true,
      enumerable: true,
      configurable: true
    });
    assert.equal(manifest.artifacts.approved, undefined);
    assert.ok(!fs.existsSync(version));
    assert.deepEqual(fs.readdirSync(appDirectory), []);
    // Failure while publishing the current pointer after the version rename.
    fs.mkdirSync(path.join(appDirectory, 'current.json'));
    assert.throws(() => promote(staging, directory, manifest, approvedRoot));
    fs.rmdirSync(path.join(appDirectory, 'current.json'));
    assert.equal(manifest.artifacts.approved, undefined);
    assert.ok(!fs.existsSync(version));
    assert.deepEqual(fs.readdirSync(appDirectory), []);
    // The same run ID can then be promoted; both persisted manifests agree.
    assert.equal(promote(staging, directory, manifest, approvedRoot), version);
    saveRun(directory, manifest);
    assert.equal(manifest.artifacts.approved, version);
    assert.deepEqual(
      JSON.parse(fs.readFileSync(path.join(version, 'manifest.json'), 'utf8')),
      JSON.parse(fs.readFileSync(path.join(directory, 'manifest.json'), 'utf8'))
    );
    assert.deepEqual(fs.readdirSync(appDirectory).sort(), [
      'current.json',
      manifest.runId
    ]);
    assert.equal(
      JSON.parse(
        fs.readFileSync(path.join(appDirectory, 'current.json'), 'utf8')
      ).runId,
      manifest.runId
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

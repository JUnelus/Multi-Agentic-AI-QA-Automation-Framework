import { writeAtomicJson } from '../utils/atomic-json';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { RunManifest } from '../schemas/run-manifest.schema';
import { validationReportSchema } from '../schemas/validation-report.schema';
import { appIdSchema } from '../schemas/app-config.schema';
import { artifactHash } from './validator';
import { readTestCases, selectTestCases } from '../utils/testcases';
import { hashInput } from '../utils/run-manifest';
import { readCode } from './code-contract';
import { assertNoSymlinks, stageCode } from '../utils/safe-path';
export function promote(
  directory: string,
  runDirectory: string,
  manifest: RunManifest,
  root = 'generated/approved'
): string {
  const report = validationReportSchema.parse(manifest.validation);
  appIdSchema.parse(manifest.application);
  if (!/^[A-Za-z0-9_-]+$/.test(manifest.runId))
    throw new Error('Invalid run ID');
  if (
    report.runId !== manifest.runId ||
    report.finalResult !== 'passed' ||
    report.defectCandidates.length ||
    [report.schema, report.typecheck, report.discovery, report.execution].some(
      (g) => g.status !== 'passed'
    )
  )
    throw new Error('Promotion requires all quality gates to pass');
  if (!report.artifactHash || artifactHash(directory) !== report.artifactHash)
    throw new Error('Artifact changed after validation');
  const cases = readTestCases(path.join(runDirectory, 'test-cases.json'));
  if (hashInput(cases) !== manifest.inputHashes.testCases)
    throw new Error('Cases changed after validation');
  const selected = selectTestCases(cases);
  if (manifest.inputHashes.selectedCases !== hashInput(selected))
    throw new Error('Approved selection changed after validation');
  const appDirectory = path.resolve(root, manifest.application);
  assertNoSymlinks(appDirectory);
  const version = path.join(appDirectory, manifest.runId);
  if (fs.existsSync(version))
    throw new Error('Approved version already exists: ' + manifest.runId);
  fs.mkdirSync(appDirectory, { recursive: true });
  // Build the complete version in a unique sibling directory, then publish it
  // with one rename so readers never observe a partially written version and a
  // failed promotion can be retried with the same run ID.
  const staging = path.join(
    appDirectory,
    '.' + manifest.runId + '.' + randomUUID() + '.tmp'
  );
  const previousApproved = manifest.artifacts.approved;
  let published = false;
  try {
    stageCode(readCode(directory), staging);
    if (artifactHash(staging) !== report.artifactHash)
      throw new Error('Promoted copy hash mismatch');
    manifest.artifacts.approved = version;
    writeAtomicJson(path.join(staging, 'manifest.json'), manifest);
    fs.copyFileSync(
      path.join(runDirectory, 'test-cases.json'),
      path.join(staging, 'test-cases.json')
    );
    fs.renameSync(staging, version);
    published = true;
    writeAtomicJson(path.join(appDirectory, 'current.json'), {
      runId: manifest.runId,
      directory: manifest.runId,
      artifactHash: report.artifactHash
    });
  } catch (error) {
    if (previousApproved === undefined) delete manifest.artifacts.approved;
    else manifest.artifacts.approved = previousApproved;
    fs.rmSync(staging, { recursive: true, force: true });
    // An unpublished pointer must not leave an orphaned version behind.
    if (published) fs.rmSync(version, { recursive: true, force: true });
    throw error;
  }
  return version;
}

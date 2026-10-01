import { writeAtomicJson } from './atomic-json';
import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { runManifestSchema, RunManifest } from '../schemas/run-manifest.schema';
import { validationReportSchema } from '../schemas/validation-report.schema';
import { appIdSchema } from '../schemas/app-config.schema';
import { emptyReport } from '../validation/validator';
import { assertNoSymlinks } from './safe-path';
export const hashInput = (input: unknown) =>
  createHash('sha256').update(JSON.stringify(input)).digest('hex');
export function createRun(
  application: string,
  model: string,
  root = 'generated/runs'
) {
  appIdSchema.parse(application);
  const runId =
    application +
    '-' +
    new Date().toISOString().replace(/[:.]/g, '-') +
    '-' +
    randomUUID().slice(0, 8);
  const directory = path.resolve(root, runId);
  assertNoSymlinks(directory);
  fs.mkdirSync(directory, { recursive: true });
  for (const folder of ['reports', 'screenshots', 'traces', 'repair'])
    fs.mkdirSync(path.join(directory, folder));
  const manifest: RunManifest = {
    runId,
    application,
    createdAt: new Date().toISOString(),
    model,
    promptVersions: {},
    inputHashes: {},
    artifacts: {},
    counts: {
      generatedTests: 0,
      approvedTests: 0,
      automationReady: 0,
      specs: 0,
      pageObjects: 0
    },
    validation: emptyReport(runId),
    demoApproval: false
  };
  saveRun(directory, manifest);
  return { directory, manifest };
}
export function saveRun(directory: string, manifest: RunManifest) {
  const validated = runManifestSchema.parse(manifest);
  // Atomic per-file replacement prevents truncated JSON after interruption.
  for (const [name, data] of [
    ['manifest.json', validated],
    [
      'validation-report.json',
      validationReportSchema.parse(validated.validation)
    ]
  ] as const) {
    const destination = path.join(directory, name);
    writeAtomicJson(destination, data);
  }
}
export function addUsage(manifest: RunManifest, usage?: RunManifest['usage']) {
  if (!usage) return;
  const before = manifest.usage || {
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0
  };
  manifest.usage = {
    inputTokens: before.inputTokens + usage.inputTokens,
    outputTokens: before.outputTokens + usage.outputTokens,
    totalTokens: before.totalTokens + usage.totalTokens
  };
}

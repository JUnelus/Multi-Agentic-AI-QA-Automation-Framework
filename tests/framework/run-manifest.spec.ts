import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  createRun,
  saveRun,
  addUsage,
  hashInput
} from '../../shared/utils/run-manifest';
import { runManifestSchema } from '../../shared/schemas/run-manifest.schema';
test('manifest roundtrip, optional usage and distinct run IDs', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-runs-'));
  try {
    const a = createRun('fixture', 'fixture', root),
      b = createRun('fixture', 'fixture', root);
    assert.notEqual(a.manifest.runId, b.manifest.runId);
    addUsage(a.manifest);
    assert.equal(a.manifest.usage, undefined);
    addUsage(a.manifest, { inputTokens: 1, outputTokens: 2, totalTokens: 3 });
    addUsage(a.manifest, { inputTokens: 1, outputTokens: 2, totalTokens: 3 });
    saveRun(a.directory, a.manifest);
    assert.equal(
      runManifestSchema.parse(
        JSON.parse(
          fs.readFileSync(path.join(a.directory, 'manifest.json'), 'utf8')
        )
      ).usage?.totalTokens,
      6
    );
    assert.equal(hashInput({ a: 1 }), hashInput({ a: 1 }));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

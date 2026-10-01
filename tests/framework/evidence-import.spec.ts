import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  validateExploration,
  importExploration,
  validateProvenance,
  evidenceHash
} from '../../shared/exploration/evidence';
import { Exploration } from '../../shared/schemas/explorer.schema';
import { loadAppConfig } from '../../shared/utils/app-config';
import { readTestCases } from '../../shared/utils/testcases';
const config = loadAppConfig('saucedemo');
function evidence(): Exploration {
  return {
    schemaVersion: '1.0',
    app: 'saucedemo',
    url: config.baseUrl,
    pages: [
      {
        id: 'PAGE-1',
        url: config.baseUrl,
        title: 'Login',
        headings: [],
        screenshot: 'screenshots/page.png',
        elements: [
          {
            evidenceId: 'OBS-1',
            tag: 'input',
            role: 'textbox',
            accessibleName: 'Username',
            selector: '#username',
            visible: true
          }
        ]
      }
    ],
    limits: {
      pagesVisited: 1,
      interactions: 0,
      durationMs: 1,
      stoppedBy: 'complete'
    }
  };
}
test('every imported page must belong to a configured origin', () => {
  assert.doesNotThrow(() =>
    validateExploration(evidence(), 'saucedemo', config)
  );
  const altered = evidence();
  altered.pages[0].url = 'https://foreign.example/';
  assert.throws(
    () => validateExploration(altered, 'saucedemo', config),
    /Unauthorized/
  );
  assert.doesNotThrow(() =>
    validateExploration(altered, 'saucedemo', {
      ...config,
      exploration: {
        ...config.exploration,
        allowedOrigins: ['https://foreign.example']
      }
    })
  );
  altered.url = 'https://other.example/';
  assert.throws(
    () => validateExploration(altered, 'saucedemo', config),
    /Unauthorized/
  );
});
test('screenshot import copies evidence, preserves identity, rejects missing and unsafe sources', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-evidence-'));
  try {
    const source = path.join(root, 'source');
    fs.mkdirSync(path.join(source, 'screenshots'), { recursive: true });
    const image = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    fs.writeFileSync(path.join(source, 'screenshots/page.png'), image);
    const file = path.join(source, 'exploration.json');
    const write = (item: Exploration) =>
      fs.writeFileSync(file, JSON.stringify(item));
    write(evidence());
    const target = path.join(root, 'target');
    const imported = importExploration(file, target, 'saucedemo', config);
    assert.deepEqual(
      fs.readFileSync(path.join(target, imported.pages[0].screenshot)),
      image
    );
    assert.equal(evidenceHash(imported), evidenceHash(evidence()));
    for (const screenshot of [
      '../page.png',
      'screenshots/../page.png',
      'screenshots\\page.png',
      'C:/page.png',
      '/page.png',
      'screenshots/%2e%2e.png',
      'screenshots/missing.png'
    ]) {
      const bad = evidence();
      bad.pages[0].screenshot = screenshot;
      write(bad);
      assert.throws(
        () =>
          importExploration(file, path.join(root, 'bad'), 'saucedemo', config),
        /Unsafe|Missing/
      );
    }
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
test('imported cases share Agent 1 provenance validation and cannot spoof observations', () => {
  const original = {
    ...readTestCases('tests/fixtures/saucedemo-test-cases.json')[0],
    application: 'saucedemo',
    explorationHash: evidenceHash(evidence()),
    expectedBehaviorSource: 'observed' as const,
    evidenceIds: ['OBS-1'],
    selectorEvidence: [{ evidenceId: 'OBS-1', selector: '#username' }]
  };
  const validate = (c = original) =>
    validateProvenance([c], evidence(), { app: 'saucedemo', config });
  assert.doesNotThrow(() => validate());
  for (const change of [
    { evidenceIds: ['fake'] },
    { evidenceIds: [] },
    { selectorEvidence: [{ evidenceId: 'OBS-1', selector: '#invented' }] },
    { selectorEvidence: [{ evidenceId: 'fake', selector: '#username' }] },
    { application: 'uitestingplayground' },
    { explorationHash: 'a'.repeat(64) },
    { expectedBehaviorSource: 'requirement' },
    { expectedBehaviorSource: undefined }
  ])
    assert.throws(() =>
      validate({ ...original, ...change } as typeof original)
    );
  assert.throws(() =>
    validateProvenance([original], undefined, { app: 'saucedemo', config })
  );
  assert.doesNotThrow(() =>
    validateProvenance(
      [{ ...original, expectedBehaviorSource: 'requirement' }],
      evidence(),
      { app: 'saucedemo', config, requirements: 'A supplied requirement' }
    )
  );
  assert.doesNotThrow(() =>
    validateProvenance(
      [{ ...original, expectedBehaviorSource: 'inferred' }],
      evidence(),
      { app: 'saucedemo', config }
    )
  );
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { appConfigSchema } from '../../shared/schemas/app-config.schema';
import { loadAppConfig } from '../../shared/utils/app-config';
import config from '../../playwright.config';
test('both app configurations validate, invalid protocol and exploration budgets rejected', () => {
  const app = loadAppConfig('saucedemo');
  assert.ok(loadAppConfig('uitestingplayground'));
  for (const patch of [
    { baseUrl: 'file:///secret' },
    { appName: '' },
    { testFocusAreas: [] },
    { exploration: { maxPages: 100 } }
  ])
    assert.throws(() => appConfigSchema.parse({ ...app, ...patch }));
});
test('project base URLs and directories remain isolated', () => {
  const projects = config.projects!;
  assert.equal(
    projects.find((p) => p.name === 'saucedemo')?.use?.baseURL,
    loadAppConfig('saucedemo').baseUrl
  );
  assert.equal(
    projects.find((p) => p.name === 'uitestingplayground')?.testDir,
    './apps/uitestingplayground/tests'
  );
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { testCasesSchema } from '../../shared/schemas/test-case.schema';
import { generatedCodeSchema } from '../../shared/schemas/generated-code.schema';
import { parseJsonResponse } from '../../shared/utils/json-response';
import { loadAppConfig } from '../../shared/utils/app-config';
export const exampleCase = { schemaVersion: '1.0', testCaseId: 'TC_LOGIN_001', feature: 'Login', scenario: 'Valid login', testType: 'positive', priority: 'high', preconditions: [], steps: [{ stepNumber: 1, action: 'Log in' }], expectedResult: 'Inventory visible', automationFeasible: true, reviewStatus: 'approved' };
test('valid and fenced payloads are validated', () => {
  assert.equal(parseJsonResponse(JSON.stringify([exampleCase]), testCasesSchema)[0].testCaseId, 'TC_LOGIN_001');
  assert.equal(parseJsonResponse('```json\n' + JSON.stringify([exampleCase]) + '\n```', testCasesSchema).length, 1);
});
test('reject malformed, empty and incorrectly shaped JSON', () => {
  for (const raw of ['', '{', '{}', '[]', '[{}]']) assert.throws(() => parseJsonResponse(raw, testCasesSchema));
});
test('reject duplicate IDs, invalid enums, missing fields and confidence', () => {
  assert.throws(() => testCasesSchema.parse([exampleCase, exampleCase]));
  for (const change of [{ testType: 'Positive' }, { scenario: '' }, { steps: [] }, { confidence: 1.1 }, { reviewStatus: undefined }]) assert.throws(() => testCasesSchema.parse([{ ...exampleCase, ...change }]));
});
test('generated contract rejects empty and wrong file types', () => {
  assert.throws(() => generatedCodeSchema.parse({ pageObjects: [], specFiles: [] }));
});
test('app config validates and app ID cannot traverse', () => {
  assert.equal(loadAppConfig('saucedemo').appName, 'SauceDemo'); assert.throws(() => loadAppConfig('../saucedemo'));
});

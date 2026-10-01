import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inspectPlaywrightReport } from '../../shared/validation/playwright-report';
import { readTestCases } from '../../shared/utils/testcases';
const cases = readTestCases('tests/fixtures/saucedemo-test-cases.json');
const payload = (
  title = 'TC_LOGIN_001 login',
  status = 'passed',
  expectedStatus = 'passed'
) => ({
  errors: [],
  suites: [
    { specs: [{ title, tests: [{ expectedStatus, results: [{ status }] }] }] }
  ]
});
test('execution report binds approved case IDs to actual discovered titles', () => {
  assert.deepEqual(inspectPlaywrightReport(payload(), false, cases), []);
  assert.ok(
    inspectPlaywrightReport(payload('unrelated'), false, cases).some((e) =>
      e.includes('missing')
    )
  );
  assert.ok(
    inspectPlaywrightReport(payload('TC_LOGIN_0010 collision'), false, cases)
      .length
  );
});
test('reject empty reports, global errors, skipped tests and expected failures', () => {
  for (const p of [
    { errors: [], suites: [] },
    { ...payload(), errors: ['failed setup'] },
    payload(undefined, 'skipped'),
    payload(undefined, 'failed', 'failed')
  ])
    assert.ok(inspectPlaywrightReport(p, false, cases).length);
  assert.throws(() => inspectPlaywrightReport({}, false));
  assert.ok(
    inspectPlaywrightReport(
      payload(undefined, 'skipped', 'skipped'),
      true,
      cases
    ).length
  );
});

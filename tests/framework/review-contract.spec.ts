import fs from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { auditCode, readCode } from '../../shared/validation/code-contract';
import { guardedTestModule } from '../../shared/validation/assertion-contract';
import { readTestCases } from '../../shared/utils/testcases';
import { loadAppConfig } from '../../shared/utils/app-config';
import { inspectPlaywrightReport } from '../../shared/validation/playwright-report';
import { executionBudget } from '../../shared/validation/execution-budget';
import { test as guardedTest } from '../../shared/validation/generated-test';
const original = readTestCases('tests/fixtures/saucedemo-test-cases.json')[0];
const cases = ['CASE-1', 'CASE-1-NEG'].map((testCaseId) => ({
  ...original,
  testCaseId
}));
const code = (body: string) => ({
  pageObjects: readCode('tests/fixtures/generated/saucedemo').pageObjects,
  specFiles: [
    {
      fileName: 'cases.spec.ts',
      code: 'import { test, expect } from "' + guardedTestModule + '";\n' + body
    }
  ]
});
const declaration = (id: string, body: string) =>
  'test("[' + id + '] example", async ({page})=>{' + body + '});';
const assertion = 'await expect(page).toHaveURL("/");';
test('each exact case needs its own invoked assertion', () => {
  assert.deepEqual(
    auditCode(code(declaration('CASE-1', assertion)), [cases[0]]),
    []
  );
  assert.deepEqual(
    auditCode(
      code(cases.map((c) => declaration(c.testCaseId, assertion)).join('\n')),
      cases
    ),
    []
  );
  for (const body of [
    '',
    '// expect(page).toHaveURL("/");\n',
    'const text="expect(page).toHaveURL()";'
  ])
    assert.ok(
      auditCode(
        code(
          declaration('CASE-1', assertion) + declaration('CASE-1-NEG', body)
        ),
        cases
      ).some((e) => e.includes('No executable assertion'))
    );
  assert.ok(
    auditCode(code(declaration('CASE-1-NEG', assertion)), cases).some((e) =>
      e.includes('Missing')
    )
  );
  assert.ok(
    auditCode(code(declaration('CASE-1', assertion).repeat(2)), [
      cases[0]
    ]).some((e) => e.includes('Duplicate'))
  );
  for (const title of ['CASE-1 example', '[CASE-1]', 'unknown'])
    assert.ok(
      auditCode(
        code(
          'test(' +
            JSON.stringify(title) +
            ',async({page})=>{' +
            assertion +
            '});'
        ),
        [cases[0]]
      ).some((e) => e.includes('Malformed'))
    );
});
test('only invoked page-object assertion helpers count', () => {
  const fixture = readCode('tests/fixtures/generated/saucedemo');
  assert.deepEqual(auditCode(fixture, [original]), []);
  fixture.specFiles[0].code = fixture.specFiles[0].code.replace(
    'await login.expectInventory();',
    ''
  );
  assert.ok(
    auditCode(fixture, [original]).some((e) =>
      e.includes('No executable assertion')
    )
  );
});
test('static navigation and API origins allow relative and explicit trusted origins only', () => {
  const config = loadAppConfig('saucedemo');
  for (const expression of [
    'page.goto("/")',
    'page.goto("https://www.saucedemo.com/")',
    'page.request.get("https://www.saucedemo.com/api")'
  ])
    assert.deepEqual(
      auditCode(
        code(declaration('CASE-1', 'await ' + expression + ';' + assertion)),
        [cases[0]],
        config
      ),
      []
    );
  for (const expression of [
    'page.goto("https://foreign.example/")',
    'page.request.get("https://foreign.example/api")',
    'fetch("https://foreign.example/")'
  ])
    assert.ok(
      auditCode(
        code(declaration('CASE-1', 'await ' + expression + ';' + assertion)),
        [cases[0]],
        config
      ).some((e) => e.includes('blocked URL'))
    );
  config.exploration.allowedOrigins.push('https://extra.example');
  assert.deepEqual(
    auditCode(
      code(
        declaration(
          'CASE-1',
          'await page.goto("https://extra.example/");' + assertion
        )
      ),
      [cases[0]],
      config
    ),
    []
  );
});
test('report binding treats CASE-1 and CASE-1-NEG independently', () => {
  const report = (ids: string[]) => ({
    errors: [],
    suites: [
      {
        specs: ids.map((id) => ({
          title: '[' + id + '] example',
          tests: [{ expectedStatus: 'passed', results: [{ status: 'passed' }] }]
        }))
      }
    ]
  });
  assert.deepEqual(
    inspectPlaywrightReport(report(['CASE-1', 'CASE-1-NEG']), false, cases),
    []
  );
  assert.ok(
    inspectPlaywrightReport(report(['CASE-1-NEG']), false, cases).some((e) =>
      e.includes('missing')
    )
  );
  assert.ok(
    inspectPlaywrightReport(report(['CASE-1', 'CASE-1']), false, [
      cases[0]
    ]).some((e) => e.includes('Duplicate'))
  );
});
test('execution budget scales with case count and rejects unbounded workloads', () => {
  assert.equal(executionBudget(1).globalTimeoutMs, 90000);
  assert.equal(executionBudget(4).globalTimeoutMs, 270000);
  assert.equal(executionBudget(4).processTimeoutMs, 300000);
  for (const count of [0, -1, 1.5, 201, 15, 30, Infinity])
    assert.throws(() => executionBudget(count));
  assert.throws(() => executionBudget(1, 500));
});

test('execution budget reserves the Playwright after-hooks slot for every case', () => {
  // Playwright 1.60 runs afterEach hooks and test-scoped fixture teardown in a
  // separate slot whose timeout equals the test timeout.
  const one = executionBudget(1);
  assert.equal(one.perTestMs, 30000);
  assert.equal(one.afterHooksMs, 30000);
  assert.equal(one.globalTimeoutMs, 30000 + 1 * (30000 + 30000));
  assert.equal(executionBudget(3, 10000).globalTimeoutMs, 90000);
  assert.doesNotThrow(() => executionBudget(14));
  assert.throws(() => executionBudget(15), /split the approved/);
});

test('suite hooks are rejected in every syntactic form so per-case budgets stay exact', () => {
  for (const body of [
    'test.beforeAll(async () => {});',
    'test.afterAll(async () => {});',
    'test["beforeAll"](async () => {});',
    'test[`afterAll`](async () => {});',
    'const { beforeAll: setup } = test; setup(async () => {});',
    'const { afterAll } = test; afterAll(async () => {});',
    'const hook = test.afterAll; hook(async () => {});',
    'for (let i = 0; i < 3; i++) test.beforeAll(async () => {});',
    'test.describe("group", () => { test.beforeAll(async () => {}); });'
  ])
    assert.ok(
      auditCode(code(body + declaration('CASE-1', assertion)), [cases[0]])
        .length > 0,
      body
    );
  assert.deepEqual(
    auditCode(
      code(
        'test.beforeEach(async ({ page }) => { await page.goto("/"); });\n' +
          'test.afterEach(async ({ page }) => { await expect(page).toHaveURL(/./); });\n' +
          declaration('CASE-1', assertion)
      ),
      [cases[0]]
    ),
    []
  );
});

test('guarded test object refuses suite hooks reached by any route at runtime', () => {
  assert.throws(
    () => guardedTest.beforeAll(async () => {}),
    /cannot register test\.beforeAll/
  );
  assert.throws(
    () => guardedTest.afterAll(async () => {}),
    /cannot register test\.afterAll/
  );
  const recovered = Object.entries(guardedTest).filter(
    ([key]) => key === 'before' + 'All'
  )[0][1];
  assert.throws(() => recovered(async () => {}), /cannot register/);
  for (const hook of ['beforeAll', 'afterAll']) {
    const descriptor = Object.getOwnPropertyDescriptor(guardedTest, hook);
    assert.equal(descriptor?.writable, false);
    assert.equal(descriptor?.configurable, false);
  }
  assert.equal(typeof guardedTest.beforeEach, 'function');
  assert.equal(typeof guardedTest.describe, 'function');
});

test('indirect browser factories, aliases, computed capabilities and timeout overrides are rejected', () => {
  for (const body of [
    'const create=browser.newContext.bind(browser);await create();',
    'await browser["newContext"]();',
    'const {newContext:create}=other;await create();',
    'const key="newContext";await other[key]();',
    'const create=other.newContext;await create();',
    'test.slow();',
    'Reflect.get(other,"newContext")();',
    'Object.getPrototypeOf(other).newContext.call(other);'
  ])
    assert.ok(
      auditCode(code(declaration('CASE-1', body + assertion)), [cases[0]])
        .length > 0,
      body
    );
});

test('manual workflow reserves time for bounded repairs, model retries and setup', () => {
  const workflow = fs.readFileSync(
    '.github/workflows/full-agentic-pipeline.yml',
    'utf8'
  );
  const minutes = Number(/timeout-minutes:\s*(\d+)/.exec(workflow)?.[1]);
  const maximumValidation = executionBudget(14).processTimeoutMs;
  const fourAttempts = maximumValidation * 4;
  const twoModelsWithRetries = 2 * 3 * 120000;
  const setupAndUpload = 20 * 60000;
  assert.ok(
    minutes * 60000 >= fourAttempts + twoModelsWithRetries + setupAndUpload
  );
});

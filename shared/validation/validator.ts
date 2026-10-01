import { executionBudget } from './execution-budget';
import { loadAppConfig } from '../utils/app-config';
import { extractCaseId } from './test-identity';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  ValidationReport,
  Gate,
  validationReportSchema
} from '../schemas/validation-report.schema';
import { TestCase } from '../schemas/test-case.schema';
import { auditCode, readCode, typecheckDirectory } from './code-contract';
import { classifyFailure } from './classify';
import { inspectPlaywrightReport } from './playwright-report';
export const notRun = (): Gate => ({
  status: 'not-run',
  diagnostics: '',
  durationMs: 0
});
export function emptyReport(runId: string): ValidationReport {
  return {
    runId,
    schema: notRun(),
    typecheck: notRun(),
    initialTypecheck: notRun(),
    discovery: notRun(),
    execution: notRun(),
    repairAttempts: 0,
    defectCandidates: [],
    finalResult: 'pending'
  };
}
export function artifactHash(directory: string): string {
  const code = readCode(directory);
  code.pageObjects.sort((a, b) => a.fileName.localeCompare(b.fileName));
  code.specFiles.sort((a, b) => a.fileName.localeCompare(b.fileName));
  return createHash('sha256').update(JSON.stringify(code)).digest('hex');
}
function childEnvironment(
  app: string,
  directory: string,
  reports: string
): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {};
  for (const key of [
    'PATH',
    'Path',
    'SystemRoot',
    'SYSTEMROOT',
    'WINDIR',
    'TEMP',
    'TMP',
    'HOME',
    'USERPROFILE',
    'LOCALAPPDATA',
    'PLAYWRIGHT_BROWSERS_PATH',
    'CI'
  ])
    if (process.env[key]) env[key] = process.env[key];
  return {
    ...env,
    QA_APP: app,
    QA_CODE_DIR: path.resolve(directory),
    QA_REPORT_DIR: path.resolve(reports),
    QA_ASSERTIONS_FILE: path.resolve(reports, 'assertions.json'),
    PLAYWRIGHT_JSON_OUTPUT_FILE: path.resolve(reports, 'execution.json')
  };
}
export function runPlaywright(
  app: string,
  directory: string,
  reports: string,
  list: boolean,
  cases: TestCase[] = []
): Gate {
  fs.mkdirSync(reports, { recursive: true });
  const start = Date.now();
  const budget = list
    ? { globalTimeoutMs: 60000, processTimeoutMs: 90000 }
    : executionBudget(cases.length || 1);
  const args = [
    require.resolve('@playwright/test/cli'),
    'test',
    '-c',
    path.resolve('playwright.generated.config.ts'),
    '--workers=1',
    '--global-timeout=' + budget.globalTimeoutMs,
    ...(list
      ? ['--list', '--reporter=json']
      : ['--reporter=line,json,./shared/validation/assertion-reporter.ts'])
  ];
  const result = spawnSync(process.execPath, args, {
    env: childEnvironment(app, directory, reports),
    encoding: 'utf8',
    timeout: budget.processTimeoutMs,
    maxBuffer: 4 * 1024 * 1024,
    windowsHide: true
  });
  let diagnostics =
    'Execution budget: ' +
    JSON.stringify(budget) +
    '\n' +
    (result.stdout || '') +
    (result.stderr || '') +
    (result.error?.message || '');
  let passed = result.status === 0;
  const jsonFile = path.join(reports, 'execution.json');
  if (passed) {
    try {
      const report = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
      const errors = inspectPlaywrightReport(report, list, cases);
      if (!list) {
        const assertions: { title: string; count: number }[] = JSON.parse(
          fs.readFileSync(path.join(reports, 'assertions.json'), 'utf8')
        );
        if (
          !Array.isArray(assertions) ||
          !assertions.length ||
          assertions.some(
            (a) =>
              !extractCaseId(a.title) ||
              !Number.isInteger(a.count) ||
              a.count < 1
          )
        )
          errors.push(
            'Every test must execute at least one successful assertion in its body'
          );
        for (const c of cases)
          if (
            assertions.filter(
              (a) => extractCaseId(a.title) === c.testCaseId && a.count > 0
            ).length !== 1
          )
            errors.push('Missing executed assertion for ' + c.testCaseId);
      }
      if (errors.length) {
        passed = false;
        diagnostics += '\n' + errors.join('\n');
      }
    } catch {
      passed = false;
      diagnostics += '\nMissing or invalid execution report';
    }
  }
  // Retain diagnostics without inheriting or logging API credentials.
  fs.writeFileSync(
    path.join(reports, list ? 'discovery.log' : 'execution.log'),
    diagnostics
  );
  return {
    status: passed ? 'passed' : 'failed',
    diagnostics,
    durationMs: Date.now() - start
  };
}
export async function validateCode(
  runId: string,
  app: string,
  directory: string,
  reports: string,
  cases: TestCase[] = []
): Promise<ValidationReport> {
  const report = emptyReport(runId);
  let before = '';
  for (const stage of [
    'schema',
    'typecheck',
    'discovery',
    'execution'
  ] as const) {
    const start = Date.now();
    try {
      if (stage === 'schema' || stage === 'typecheck') {
        if (stage === 'schema') {
          before = artifactHash(directory);
          if (!cases.length)
            throw new Error('Validation requires approved test cases');
          executionBudget(cases.length);
        }
        const errors =
          stage === 'schema'
            ? auditCode(readCode(directory), cases, loadAppConfig(app))
            : typecheckDirectory(directory);
        report[stage] = {
          status: errors.length ? 'failed' : 'passed',
          diagnostics: errors.join('\n'),
          durationMs: Date.now() - start
        };
      } else
        report[stage] = runPlaywright(
          app,
          directory,
          path.join(reports, stage),
          stage === 'discovery',
          cases
        );
    } catch (error) {
      report[stage] = {
        status: 'failed',
        diagnostics:
          error instanceof Error ? error.message : 'Validation failed',
        durationMs: Date.now() - start
      };
    }
    if (stage === 'typecheck') report.initialTypecheck = report.typecheck;
    if (report[stage].status === 'failed') {
      report.category = classifyFailure(stage, report[stage].diagnostics);
      if (report.category === 'POSSIBLE_PRODUCT_DEFECT')
        report.defectCandidates.push(report[stage].diagnostics);
      report.finalResult = 'failed';
      return validationReportSchema.parse(report);
    }
  }
  if (artifactHash(directory) !== before) {
    report.finalResult = 'failed';
    report.category = 'GENERATOR_ERROR';
    report.execution = {
      status: 'failed',
      diagnostics: 'Artifacts changed during validation',
      durationMs: 0
    };
    return validationReportSchema.parse(report);
  }
  report.finalResult = 'passed';
  report.artifactHash = before;
  return validationReportSchema.parse(report);
}

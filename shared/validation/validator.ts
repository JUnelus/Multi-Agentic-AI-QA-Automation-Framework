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
  const args = [
    require.resolve('@playwright/test/cli'),
    'test',
    '-c',
    path.resolve('playwright.generated.config.ts'),
    '--workers=1',
    '--global-timeout=60000',
    ...(list ? ['--list', '--reporter=json'] : ['--reporter=line,json'])
  ];
  const result = spawnSync(process.execPath, args, {
    env: childEnvironment(app, directory, reports),
    encoding: 'utf8',
    timeout: 90000,
    maxBuffer: 4 * 1024 * 1024,
    windowsHide: true
  });
  let diagnostics =
    (result.stdout || '') +
    (result.stderr || '') +
    (result.error?.message || '');
  let passed = result.status === 0;
  const jsonFile = path.join(reports, 'execution.json');
  if (passed) {
    try {
      const report = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
      const errors = inspectPlaywrightReport(report, list, cases);
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
        if (stage === 'schema') before = artifactHash(directory);
        const errors =
          stage === 'schema'
            ? auditCode(readCode(directory), cases)
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

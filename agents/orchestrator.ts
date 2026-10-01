import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { loadAppConfig } from '../shared/utils/app-config';
import { explore } from './agent0-application-explorer';
import { createTestCases } from './agent1-testcase-creator';
import { generateScripts } from './agent2-script-generator';
import { readTestCases, exportTestCases, selectTestCases } from '../shared/utils/testcases';
import { createRun, saveRun, hashInput, addUsage } from '../shared/utils/run-manifest';
import { stageCode } from '../shared/utils/safe-path';
import { readCode } from '../shared/validation/code-contract';
import { validateCode } from '../shared/validation/validator';
import { repairLoop } from '../shared/validation/repair';
import { Model, OPENAI_MODEL } from '../shared/utils/openai-client';
import { explorationSchema } from '../shared/schemas/explorer.schema';
export interface PipelineOptions {
  app: string; noAi?: boolean; exploreOnly?: boolean; generateCasesOnly?: boolean;
  generateCodeOnly?: boolean; validateOnly?: boolean; casesFile?: string; codeDirectory?: string;
  explorationFile?: string; requirementsFile?: string; demoApproveDrafts?: boolean; maxRepairs?: number;
}
export async function pipeline(options: PipelineOptions) {
  if ([options.exploreOnly, options.generateCasesOnly, options.generateCodeOnly, options.validateOnly].filter(Boolean).length > 1) throw new Error('Only one partial mode may be selected');
  if (options.validateOnly && (!options.codeDirectory || !options.casesFile)) throw new Error('--validate-only requires --code-dir and --cases');
  if (options.generateCodeOnly && !options.casesFile && !options.noAi) throw new Error('--generate-code-only requires --cases');
  if (!Number.isInteger(options.maxRepairs ?? 3) || (options.maxRepairs ?? 3) < 0 || (options.maxRepairs ?? 3) > 3) throw new Error('--max-repairs must be 0..3');
  const config = loadAppConfig(options.app);
  const run = createRun(options.app, options.noAi ? 'fixture' : OPENAI_MODEL);
  const { manifest, directory } = run;
  console.log('Run: ' + directory);
  try {
    manifest.inputHashes.appConfig = hashInput(config);
    for (const name of ['testcase-creator', 'script-generator']) manifest.promptVersions[name] = hashInput(fs.readFileSync('agents/prompts/' + name + '.prompt.md', 'utf8'));
    manifest.demoApproval = !!options.demoApproveDrafts || !!options.noAi;
    let cases;
    if (!options.validateOnly) {
      const evidence = options.explorationFile ? explorationSchema.parse(JSON.parse(fs.readFileSync(options.explorationFile, 'utf8'))) : await explore(options.app, config, directory);
      if (evidence.app !== options.app || new URL(evidence.url).origin !== new URL(config.baseUrl).origin) throw new Error('Exploration belongs to another application');
      fs.writeFileSync(path.join(directory, 'exploration.json'), JSON.stringify(evidence, null, 2));
      manifest.artifacts.exploration = 'exploration.json'; manifest.inputHashes.exploration = hashInput(evidence);
      if (options.exploreOnly) { saveRun(directory, manifest); return run; }
      if (options.casesFile) cases = readTestCases(options.casesFile);
      else {
        const requirements = options.requirementsFile ? fs.readFileSync(options.requirementsFile, 'utf8') : undefined;
        if (requirements) manifest.inputHashes.requirements = hashInput(requirements);
        const baseline = options.noAi ? readTestCases('tests/fixtures/' + options.app + '-test-cases.json') : undefined;
        const fixtureModel: Model | undefined = baseline ? async () => ({ text: JSON.stringify(baseline.map(c => ({ ...c, reviewStatus: 'draft', expectedBehaviorSource: 'inferred' }))) }) : undefined;
        const created = await createTestCases(config, evidence, fixtureModel, requirements);
        addUsage(manifest, created.usage);
        // Only the committed acceptance baseline receives fixture approval.
        cases = baseline || created.cases;
      }
    } else cases = readTestCases(options.casesFile!);
    await exportTestCases(cases, directory);
    manifest.inputHashes.testCases = hashInput(cases);
    manifest.artifacts.testCases = 'test-cases.json'; manifest.artifacts.excel = 'test-cases.xlsx';
    manifest.counts.generatedTests = cases.length; manifest.counts.approvedTests = cases.filter(c => c.reviewStatus === 'approved').length;
    if (options.generateCasesOnly) { saveRun(directory, manifest); return run; }
    const selected = selectTestCases(cases, options.demoApproveDrafts);
    manifest.counts.automationReady = selected.length;
    let code;
    if (options.validateOnly) code = readCode(options.codeDirectory!);
    else {
      const fixtureModel: Model | undefined = options.noAi ? async () => ({ text: JSON.stringify(readCode('tests/fixtures/generated/' + options.app)) }) : undefined;
      const generated = await generateScripts(config, selected, fixtureModel, options.demoApproveDrafts);
      code = generated.code; addUsage(manifest, generated.usage);
    }
    manifest.counts.specs = code.specFiles.length; manifest.counts.pageObjects = code.pageObjects.length;
    const staging = path.join(directory, 'staging');
    stageCode(code, staging); manifest.artifacts.staging = 'staging';
    saveRun(directory, manifest);
    const result = await repairLoop({
      code, directory: staging, runDirectory: directory, maxRepairs: options.maxRepairs,
      validate: (_code, current, attempt) => validateCode(manifest.runId, options.app, current, path.join(directory, 'reports', 'attempt-' + attempt), selected)
    });
    manifest.validation = result.report;
    manifest.artifacts.validatedCode = path.relative(directory, result.directory);
    manifest.artifacts.reports = 'reports';
    saveRun(directory, manifest);
    return run;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Pipeline failed';
    const safeMessage = process.env.OPENAI_API_KEY ? message.replaceAll(process.env.OPENAI_API_KEY, '[REDACTED]') : message;
    manifest.validation.finalResult = 'failed';
    manifest.validation.category = 'GENERATOR_ERROR';
    manifest.validation.schema = { status: 'failed', diagnostics: safeMessage, durationMs: 0 };
    saveRun(directory, manifest);
    throw new Error(safeMessage);
  }
}
export function parseOptions(args: string[]): PipelineOptions {
  const { values } = parseArgs({ args, options: {
    app: { type: 'string', default: 'saucedemo' }, 'no-ai': { type: 'boolean' },
    'explore-only': { type: 'boolean' }, 'generate-cases-only': { type: 'boolean' },
    'generate-code-only': { type: 'boolean' }, 'validate-only': { type: 'boolean' },
    cases: { type: 'string' }, 'code-dir': { type: 'string' }, exploration: { type: 'string' },
    requirements: { type: 'string' }, 'demo-approve-drafts': { type: 'boolean' }, 'max-repairs': { type: 'string', default: '3' }
  } });
  return { app: values.app!, noAi: values['no-ai'], exploreOnly: values['explore-only'], generateCasesOnly: values['generate-cases-only'], generateCodeOnly: values['generate-code-only'], validateOnly: values['validate-only'], casesFile: values.cases, codeDirectory: values['code-dir'], explorationFile: values.exploration, requirementsFile: values.requirements, demoApproveDrafts: values['demo-approve-drafts'], maxRepairs: Number(values['max-repairs']) };
}
if (require.main === module) {
  pipeline(parseOptions(process.argv.slice(2))).then(run => {
    console.log('Result: ' + run.manifest.validation.finalResult);
    if (run.manifest.validation.finalResult === 'failed') process.exitCode = 1;
  }).catch(error => { console.error(error.message); process.exitCode = 1; });
}


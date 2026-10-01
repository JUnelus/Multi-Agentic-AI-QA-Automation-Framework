import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { AppConfig } from '../schemas/app-config.schema';
import { Exploration, explorationSchema } from '../schemas/explorer.schema';
import { TestCase, testCasesSchema } from '../schemas/test-case.schema';
import { allowedNavigation } from './route-observer';
import { assertNoSymlinks } from '../utils/safe-path';
export function evidenceHash(evidence: Exploration): string {
  // Evidence may be copied to another directory. File location is not identity.
  const pages = evidence.pages.map(
    ({ screenshot: _location, ...page }) => page
  );
  return createHash('sha256')
    .update(JSON.stringify({ ...evidence, pages }))
    .digest('hex');
}
export function validateExploration(
  evidence: Exploration,
  app: string,
  config: AppConfig
): Exploration {
  const parsed = explorationSchema.parse(evidence);
  if (parsed.app !== app) throw new Error('Exploration application mismatch');
  function visit(value: unknown): void {
    if (!value || typeof value !== 'object') return;
    for (const [key, item] of Object.entries(value)) {
      if (
        /^(url|href|src|actionUrl)$/i.test(key) &&
        typeof item === 'string' &&
        !allowedNavigation(
          item,
          config.baseUrl,
          config.exploration.allowedOrigins
        )
      )
        throw new Error('Unauthorized exploration origin: ' + item);
      if (typeof item === 'object') visit(item);
    }
  }
  visit(parsed);
  return parsed;
}
export function importExploration(
  sourceFile: string,
  directory: string,
  app: string,
  config: AppConfig
): Exploration {
  assertNoSymlinks(sourceFile);
  const sourceRoot = path.dirname(path.resolve(sourceFile));
  const evidence = validateExploration(
    JSON.parse(fs.readFileSync(sourceFile, 'utf8')),
    app,
    config
  );
  const copies = evidence.pages.map((page, index) => {
    if (!/^screenshots\/[A-Za-z0-9_-]+\.png$/.test(page.screenshot))
      throw new Error('Unsafe screenshot path: ' + page.screenshot);
    const source = path.resolve(sourceRoot, page.screenshot);
    if (path.dirname(source) !== path.join(sourceRoot, 'screenshots'))
      throw new Error('Screenshot escapes evidence directory');
    assertNoSymlinks(source);
    if (!fs.existsSync(source) || !fs.lstatSync(source).isFile())
      throw new Error('Missing screenshot evidence: ' + page.screenshot);
    if (fs.statSync(source).size > 20 * 1024 * 1024)
      throw new Error('Screenshot exceeds 20 MB limit');
    const bytes = fs.readFileSync(source);
    if (
      !bytes
        .subarray(0, 8)
        .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    )
      throw new Error('Screenshot is not a PNG: ' + page.screenshot);
    return { bytes, reference: 'screenshots/import-' + (index + 1) + '.png' };
  });
  const screenshots = path.resolve(directory, 'screenshots');
  assertNoSymlinks(screenshots);
  fs.mkdirSync(screenshots, { recursive: true });
  for (const [index, copy] of copies.entries()) {
    fs.writeFileSync(path.join(directory, copy.reference), copy.bytes, {
      flag: 'wx'
    });
    evidence.pages[index].screenshot = copy.reference;
  }
  return evidence;
}
export function validateProvenance(
  cases: TestCase[],
  evidence: Exploration | undefined,
  options: {
    app: string;
    config: AppConfig;
    requirements?: string;
    generated?: boolean;
  }
): TestCase[] {
  const parsed = testCasesSchema.parse(cases);
  if (evidence) validateExploration(evidence, options.app, options.config);
  const items = new Map(
    evidence?.pages.flatMap((p) =>
      p.elements.map((e) => [e.evidenceId, e] as const)
    ) || []
  );
  const ids = new Set(
    evidence?.pages.flatMap((p) => [
      p.id,
      ...p.elements.map((e) => e.evidenceId)
    ]) || []
  );
  for (const c of parsed) {
    if (
      !c.expectedBehaviorSource ||
      !c.requirementSource ||
      c.confidence === undefined ||
      !c.evidenceIds
    )
      throw new Error(c.testCaseId + ': missing behavior provenance');
    if (c.application && c.application !== options.app)
      throw new Error(c.testCaseId + ': case application mismatch');
    if (
      c.explorationHash &&
      (!evidence || c.explorationHash !== evidenceHash(evidence))
    )
      throw new Error(c.testCaseId + ': case exploration fingerprint mismatch');
    if (
      c.expectedBehaviorSource === 'approved-baseline' &&
      (options.generated || c.reviewStatus !== 'approved')
    )
      throw new Error('Unsupported approved-baseline claim');
    if (
      c.expectedBehaviorSource === 'requirement' &&
      !options.requirements?.trim()
    )
      throw new Error(
        'Requirement behavior requires the referenced requirements input'
      );
    if (c.expectedBehaviorSource === 'observed' && !c.evidenceIds.length)
      throw new Error('Observed behavior requires supporting evidence');
    for (const id of c.evidenceIds)
      if (!ids.has(id)) throw new Error('Unknown evidence ID: ' + id);
    for (const selector of c.selectorEvidence || [])
      if (
        !items.has(selector.evidenceId) ||
        items.get(selector.evidenceId)?.selector !== selector.selector
      )
        throw new Error(
          'Selector lacks matching observed evidence: ' + selector.evidenceId
        );
  }
  return parsed;
}

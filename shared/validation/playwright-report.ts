import { extractCaseId } from './test-identity';
import { z } from 'zod';
import { TestCase } from '../schemas/test-case.schema';
const specSchema = z.object({
  title: z.string(),
  tests: z
    .array(
      z.object({
        expectedStatus: z.string(),
        results: z.array(z.object({ status: z.string() }))
      })
    )
    .min(1)
});
type ReportSuite = {
  specs: z.infer<typeof specSchema>[];
  suites: ReportSuite[];
};
const suiteSchema: z.ZodType<ReportSuite> = z.lazy(() =>
  z.object({
    specs: z.array(specSchema).default([]),
    suites: z.array(suiteSchema).default([])
  })
);
export function inspectPlaywrightReport(
  payload: unknown,
  discovery: boolean,
  cases: TestCase[] = []
): string[] {
  const report = z
    .object({ suites: z.array(suiteSchema), errors: z.array(z.unknown()) })
    .parse(payload);
  const specs: z.infer<typeof specSchema>[] = [];
  const visit = (suite: ReportSuite) => {
    specs.push(...suite.specs);
    suite.suites.forEach(visit);
  };
  report.suites.forEach(visit);
  const errors: string[] = [];
  if (report.errors.length) errors.push('Playwright reported global errors');
  if (!specs.length) errors.push('No tests discovered');
  for (const spec of specs) {
    if (
      spec.tests.some(
        (t) =>
          t.expectedStatus !== 'passed' ||
          (!discovery &&
            (!t.results.length || t.results.some((r) => r.status !== 'passed')))
      )
    )
      errors.push('Skipped or non-passing test: ' + spec.title);
  }
  const counts = new Map<string, number>();
  for (const spec of specs) {
    const id = extractCaseId(spec.title);
    if (!id) {
      errors.push('Malformed or missing case ID: ' + spec.title);
      continue;
    }
    counts.set(id, (counts.get(id) || 0) + spec.tests.length);
    if (cases.length && !cases.some((c) => c.testCaseId === id))
      errors.push('Unapproved generated test: ' + id);
  }
  for (const [id, count] of counts)
    if (count !== 1) errors.push('Duplicate exact case ID: ' + id);
  for (const c of cases)
    if (counts.get(c.testCaseId) !== 1)
      errors.push(
        'Approved case missing or duplicated in report: ' + c.testCaseId
      );
  return errors;
}

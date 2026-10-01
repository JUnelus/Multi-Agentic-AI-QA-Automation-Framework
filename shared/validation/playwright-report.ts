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
  const matches = (title: string, id: string) =>
    title === id ||
    (title.startsWith(id) && /^[\s:-]/.test(title.slice(id.length)));
  for (const c of cases)
    if (!specs.some((s) => matches(s.title, c.testCaseId)))
      errors.push('Approved case missing from report: ' + c.testCaseId);
  if (cases.length)
    for (const spec of specs)
      if (!cases.some((c) => matches(spec.title, c.testCaseId)))
        errors.push('Unapproved generated test: ' + spec.title);
  return errors;
}

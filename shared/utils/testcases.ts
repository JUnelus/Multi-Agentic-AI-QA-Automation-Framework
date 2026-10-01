import fs from 'node:fs';
import path from 'node:path';
import ExcelJS from 'exceljs';
import { TestCase, testCasesSchema } from '../schemas/test-case.schema';
export function readTestCases(file: string): TestCase[] {
  return testCasesSchema.parse(JSON.parse(fs.readFileSync(file, 'utf8')));
}
export function selectTestCases(
  cases: TestCase[],
  allowDrafts = false
): TestCase[] {
  const selected = testCasesSchema
    .parse(cases)
    .filter(
      (c) =>
        c.automationFeasible &&
        (c.reviewStatus === 'approved' ||
          (allowDrafts && c.reviewStatus === 'draft'))
    );
  if (!selected.length)
    throw new Error(
      'No approved automation-ready test cases. Review test-cases.json or explicitly use --demo-approve-drafts.'
    );
  return selected;
}
export async function exportTestCases(cases: TestCase[], directory: string) {
  const validated = testCasesSchema.parse(cases);
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(
    path.join(directory, 'test-cases.json'),
    JSON.stringify(validated, null, 2)
  );
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Test Cases');
  const keys = Array.from(
    new Set(validated.flatMap((c) => Object.keys(c)))
  ) as (keyof TestCase)[];
  // All schema fields are represented even when absent from the first case.
  const columns = Array.from(
    new Set([
      ...keys,
      'selectorEvidence',
      'evidenceIds',
      'requirementSource',
      'expectedBehaviorSource',
      'confidence',
      'pageObject'
    ])
  ) as (keyof TestCase)[];
  sheet.columns = columns.map((key) => ({
    header: key === 'reviewStatus' ? 'Review Status' : key,
    key,
    width: key === 'steps' ? 70 : 28
  }));
  for (const c of validated)
    sheet.addRow(
      Object.fromEntries(
        columns.map((k) => [
          k,
          typeof c[k] === 'object' ? JSON.stringify(c[k]) : c[k]
        ])
      )
    );
  sheet.getRow(1).font = { bold: true };
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  sheet.eachRow((row) => {
    row.alignment = { vertical: 'top', wrapText: true };
  });
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: columns.length }
  };
  await workbook.xlsx.writeFile(path.join(directory, 'test-cases.xlsx'));
}

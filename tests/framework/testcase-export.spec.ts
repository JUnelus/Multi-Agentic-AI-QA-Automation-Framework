import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import ExcelJS from 'exceljs';
import {
  exportTestCases,
  readTestCases,
  selectTestCases
} from '../../shared/utils/testcases';
import { testCasesSchema } from '../../shared/schemas/test-case.schema';
const cases = testCasesSchema.parse([
  {
    schemaVersion: '1.0',
    testCaseId: 'CASE-1',
    feature: 'Login',
    scenario: 'Login',
    testType: 'positive',
    priority: 'high',
    preconditions: [],
    steps: [{ stepNumber: 1, action: 'Login' }],
    expectedResult: 'Inventory',
    automationFeasible: true,
    reviewStatus: 'approved'
  }
]);
test('JSON and Excel preserve every field; Excel edits cannot affect selection', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-cases-'));
  try {
    await exportTestCases(cases, dir);
    assert.deepEqual(readTestCases(path.join(dir, 'test-cases.json')), cases);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(path.join(dir, 'test-cases.xlsx'));
    const sheet = workbook.getWorksheet('Test Cases')!;
    sheet.getRow(1).eachCell((cell, col) => {
      const key = (
        cell.value === 'Review Status' ? 'reviewStatus' : cell.value
      ) as keyof (typeof cases)[0];
      if (cases[0][key] !== undefined)
        assert.deepEqual(
          typeof cases[0][key] === 'object'
            ? JSON.parse(String(sheet.getCell(2, col).value))
            : sheet.getCell(2, col).value,
          cases[0][key]
        );
    });
    sheet.spliceColumns(1, 2);
    await workbook.xlsx.writeFile(path.join(dir, 'test-cases.xlsx'));
    assert.deepEqual(
      selectTestCases(readTestCases(path.join(dir, 'test-cases.json'))),
      cases
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
test('only approved feasible cases selected; demo override never admits rejected cases', () => {
  const draft = { ...cases[0], reviewStatus: 'draft' as const };
  const rejected = { ...cases[0], reviewStatus: 'rejected' as const };
  assert.throws(() => selectTestCases([draft]), /No approved/);
  assert.equal(selectTestCases([draft], true).length, 1);
  assert.throws(() => selectTestCases([rejected], true), /No approved/);
  assert.throws(
    () => selectTestCases([{ ...cases[0], automationFeasible: false }]),
    /No approved/
  );
});

test('Excel retains provenance fields that occur only on later cases', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-columns-'));
  try {
    const mixed = [
      cases[0],
      {
        ...cases[0],
        testCaseId: 'CASE-2',
        application: 'saucedemo',
        explorationHash: 'a'.repeat(64)
      }
    ];
    await exportTestCases(mixed, dir);
    const book = new ExcelJS.Workbook();
    await book.xlsx.readFile(path.join(dir, 'test-cases.xlsx'));
    const sheet = book.getWorksheet('Test Cases')!;
    const columns = new Map<string, number>();
    sheet.getRow(1).eachCell((cell, col) => {
      columns.set(String(cell.value), col);
    });
    assert.equal(
      sheet.getCell(3, columns.get('application')!).value,
      'saucedemo'
    );
    assert.equal(
      sheet.getCell(3, columns.get('explorationHash')!).value,
      'a'.repeat(64)
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

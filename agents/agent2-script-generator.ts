import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import ExcelJS from 'exceljs';
import { loadAppConfig } from '../shared/utils/app-config';
import { parseJsonResponse } from '../shared/utils/json-response';
import { openai, OPENAI_MODEL } from '../shared/utils/openai-client';

dotenv.config({ quiet: true });

interface AutomationReadyTestCase {
  testCaseId: string;
  feature: string;
  scenario: string;
  testType: string;
  priority: string;
  preconditions: string;
  steps: string;
  expectedResult: string;
  pageObject: string;
}

interface GeneratedCodeFile {
  fileName: string;
  code: string;
}

interface GeneratedAutomationOutput {
  pageObjects: GeneratedCodeFile[];
  specFiles: GeneratedCodeFile[];
}

async function readAutomationReadyTestCases(filePath: string) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const worksheet = workbook.getWorksheet('Test Cases');
  if (!worksheet) {
    throw new Error('Test Cases worksheet not found.');
  }

  const testCases: AutomationReadyTestCase[] = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      return;
    }

    const automationFeasible = row.getCell(9).value?.toString();

    if (automationFeasible?.toLowerCase() === 'yes') {
      testCases.push({
        testCaseId: row.getCell(1).value?.toString() ?? '',
        feature: row.getCell(2).value?.toString() ?? '',
        scenario: row.getCell(3).value?.toString() ?? '',
        testType: row.getCell(4).value?.toString() ?? '',
        priority: row.getCell(5).value?.toString() ?? '',
        preconditions: row.getCell(6).value?.toString() ?? '',
        steps: row.getCell(7).value?.toString() ?? '',
        expectedResult: row.getCell(8).value?.toString() ?? '',
        pageObject: row.getCell(11).value?.toString() ?? ''
      });
    }
  });

  return testCases;
}

async function main() {
  const targetApp = process.env.TARGET_APP || 'saucedemo';
  const appConfig = loadAppConfig(targetApp);

  const testCases = await readAutomationReadyTestCases(appConfig.testCaseOutput);

  const promptTemplate = fs.readFileSync(
    path.join(process.cwd(), 'agents', 'prompts', 'script-generator.prompt.md'),
    'utf-8'
  );

  const prompt = `
${promptTemplate}

Application Name:
${appConfig.appName}

Base URL:
${appConfig.baseUrl}

Test Cases:
${JSON.stringify(testCases, null, 2)}
`;

  const response = await openai.responses.create({
    model: OPENAI_MODEL,
    input: prompt
  });

  const generated = parseJsonResponse<GeneratedAutomationOutput>(response.output_text);

  fs.mkdirSync(appConfig.generatedPageObjectsPath, { recursive: true });
  fs.mkdirSync(appConfig.generatedSpecsPath, { recursive: true });

  generated.pageObjects.forEach((file) => {
    fs.writeFileSync(path.join(appConfig.generatedPageObjectsPath, file.fileName), file.code);
  });

  generated.specFiles.forEach((file) => {
    fs.writeFileSync(path.join(appConfig.generatedSpecsPath, file.fileName), file.code);
  });

  console.log(`Generated Page Objects: ${appConfig.generatedPageObjectsPath}`);
  console.log(`Generated Specs: ${appConfig.generatedSpecsPath}`);
}

main().catch((error) => {
  console.error('Agent 2 failed:', error);
  process.exit(1);
});



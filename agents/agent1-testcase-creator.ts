import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import ExcelJS from 'exceljs';
import { loadAppConfig } from '../shared/utils/app-config';
import { parseJsonResponse } from '../shared/utils/json-response';
import { openai, OPENAI_MODEL } from '../shared/utils/openai-client';

dotenv.config({ quiet: true });

interface GeneratedTestCase {
  testCaseId: string;
  feature: string;
  scenario: string;
  testType: string;
  priority: string;
  preconditions: string;
  steps: string[] | string;
  expectedResult: string;
  automationFeasible: string;
  suggestedSelectorStrategy: string;
  pageObject: string;
}

async function main() {
  const targetApp = process.env.TARGET_APP || 'saucedemo';
  const appConfig = loadAppConfig(targetApp);

  const promptTemplate = fs.readFileSync(
    path.join(process.cwd(), 'agents', 'prompts', 'testcase-creator.prompt.md'),
    'utf-8'
  );

  const prompt = promptTemplate
    .replace('{{APP_NAME}}', appConfig.appName)
    .replace('{{BASE_URL}}', appConfig.baseUrl)
    .replace('{{FOCUS_AREAS}}', appConfig.testFocusAreas.join(', '));

  const response = await openai.responses.create({
    model: OPENAI_MODEL,
    input: prompt
  });

  const rawText = response.output_text;
  const testCases = parseJsonResponse<GeneratedTestCase[]>(rawText);

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Test Cases');

  worksheet.columns = [
    { header: 'Test Case ID', key: 'testCaseId', width: 20 },
    { header: 'Feature', key: 'feature', width: 20 },
    { header: 'Scenario', key: 'scenario', width: 40 },
    { header: 'Test Type', key: 'testType', width: 20 },
    { header: 'Priority', key: 'priority', width: 15 },
    { header: 'Preconditions', key: 'preconditions', width: 40 },
    { header: 'Steps', key: 'steps', width: 60 },
    { header: 'Expected Result', key: 'expectedResult', width: 50 },
    { header: 'Automation Feasible', key: 'automationFeasible', width: 25 },
    {
      header: 'Suggested Selector Strategy',
      key: 'suggestedSelectorStrategy',
      width: 35
    },
    { header: 'Page Object', key: 'pageObject', width: 25 }
  ];

  testCases.forEach((testCase) => {
    worksheet.addRow({
      ...testCase,
      steps: Array.isArray(testCase.steps) ? testCase.steps.join('\n') : testCase.steps
    });
  });

  fs.mkdirSync(path.dirname(appConfig.testCaseOutput), { recursive: true });
  await workbook.xlsx.writeFile(appConfig.testCaseOutput);

  console.log(`Test cases generated: ${appConfig.testCaseOutput}`);
}

main().catch((error) => {
  console.error('Agent 1 failed:', error);
  process.exit(1);
});



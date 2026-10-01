import { test } from 'multi-agentic-ai-qa-automation-framework/generated-test';
import { TextInputPage } from '../page-objects/TextInputPage';
test('[TC_TEXT_001] button name updates from input', async ({ page }) => {
  const input = new TextInputPage(page);
  await input.renameButton('QA verified');
  await input.expectButtonName('QA verified');
});

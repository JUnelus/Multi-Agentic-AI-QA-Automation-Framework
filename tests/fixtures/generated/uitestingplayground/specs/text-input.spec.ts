import { test } from '@playwright/test';
import { TextInputPage } from '../page-objects/TextInputPage';
test('TC_TEXT_001 button name updates from input', async ({ page }) => {
  const input = new TextInputPage(page);
  await input.renameButton('QA verified');
  await input.expectButtonName('QA verified');
});

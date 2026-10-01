import { test } from 'multi-agentic-ai-qa-automation-framework/generated-test';
import { LoginPage } from '../page-objects/LoginPage';
test('[TC_LOGIN_001] approved standard user reaches inventory', async ({
  page
}) => {
  const login = new LoginPage(page);
  await login.login();
  await login.expectInventory();
});

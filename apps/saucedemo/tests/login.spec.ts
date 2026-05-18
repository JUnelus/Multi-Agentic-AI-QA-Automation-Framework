import { test } from '@playwright/test';
import { InventoryPage } from '../pages/InventoryPage';
import { LoginPage } from '../pages/LoginPage';

test.describe('SauceDemo Login Tests', () => {
  test('TC_LOGIN_001 - Login with valid standard user', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const inventoryPage = new InventoryPage(page);

    await loginPage.goto();
    await loginPage.login('standard_user', 'secret_sauce');
    await inventoryPage.verifyInventoryPageLoaded();
  });

  test('TC_LOGIN_002 - Locked out user should see error', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.login('locked_out_user', 'secret_sauce');
    await loginPage.verifyLoginError('Sorry, this user has been locked out');
  });
});


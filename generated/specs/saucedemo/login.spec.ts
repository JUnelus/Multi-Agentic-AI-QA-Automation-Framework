import { expect, test } from '@playwright/test';
import { LoginPage } from '../pageObjects/LoginPage';
import { InventoryPage } from '../pageObjects/InventoryPage';

const invalidCredentialsError = 'Epic sadface: Username and password do not match any user in this service';

test.describe('SauceDemo Login', () => {
  test('TC_LOGIN_001 - login with valid standard user credentials', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const inventoryPage = new InventoryPage(page);
    await loginPage.goto();
    await loginPage.login('standard_user', 'secret_sauce');
    await inventoryPage.expectLoaded();
  });

  test('TC_LOGIN_002 - login with locked out user', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('locked_out_user', 'secret_sauce');
    await loginPage.expectOnLoginPage();
    await loginPage.expectError('Epic sadface: Sorry, this user has been locked out.');
  });

  test('TC_LOGIN_003 - login with invalid username and valid password', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('invalid_user', 'secret_sauce');
    await loginPage.expectOnLoginPage();
    await loginPage.expectError(invalidCredentialsError);
  });

  test('TC_LOGIN_004 - login with valid username and invalid password', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('standard_user', 'wrong_password');
    await loginPage.expectOnLoginPage();
    await loginPage.expectError(invalidCredentialsError);
  });

  test('TC_LOGIN_005 - login with empty username and password', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.submit();
    await loginPage.expectError('Epic sadface: Username is required');
  });

  test('TC_LOGIN_006 - login with username only', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.usernameInput.fill('standard_user');
    await loginPage.submit();
    await loginPage.expectError('Epic sadface: Password is required');
  });

  test('TC_LOGIN_007 - login with password only', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.passwordInput.fill('secret_sauce');
    await loginPage.submit();
    await loginPage.expectError('Epic sadface: Username is required');
  });

  test('TC_LOGIN_008 - dismiss login error message', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.submit();
    await loginPage.expectError('Epic sadface: Username is required');
    await loginPage.dismissError();
    await loginPage.expectErrorDismissed();
  });

  test('TC_LOGIN_009 - login with leading and trailing spaces in username', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(' standard_user ', 'secret_sauce');
    await loginPage.expectOnLoginPage();
    await loginPage.expectError(invalidCredentialsError);
  });

  test('TC_LOGIN_010 - verify session persistence after page refresh', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const inventoryPage = new InventoryPage(page);
    await loginPage.goto();
    await loginPage.login('standard_user', 'secret_sauce');
    await inventoryPage.expectLoaded();
    await page.reload();
    await inventoryPage.expectLoaded();
  });

  test('TC_LOGIN_011 - access inventory page without authentication', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.gotoPath('inventory.html');
    await loginPage.expectOnLoginPage();
    await loginPage.expectErrorContaining('You can only access');
  });

  test('TC_LOGIN_012 - logout from application', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const inventoryPage = new InventoryPage(page);
    await loginPage.goto();
    await loginPage.login('standard_user', 'secret_sauce');
    await inventoryPage.expectLoaded();
    await inventoryPage.logout();
    await loginPage.expectOnLoginPage();
  });
});
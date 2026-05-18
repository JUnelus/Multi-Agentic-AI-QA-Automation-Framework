import { test } from '@playwright/test';
import { LoginPage } from '../pageObjects/LoginPage';
import { InventoryPage } from '../pageObjects/InventoryPage';
import { CartPage } from '../pageObjects/CartPage';
import { CheckoutPage } from '../pageObjects/CheckoutPage';
import { CheckoutOverviewPage } from '../pageObjects/CheckoutOverviewPage';

async function openCheckoutInformation(page: import('@playwright/test').Page): Promise<CheckoutPage> {
  const loginPage = new LoginPage(page);
  const inventoryPage = new InventoryPage(page);
  const cartPage = new CartPage(page);
  const checkoutPage = new CheckoutPage(page);
  await loginPage.goto();
  await loginPage.login('standard_user', 'secret_sauce');
  await inventoryPage.addProduct('Sauce Labs Backpack');
  await inventoryPage.openCart();
  await cartPage.checkout();
  await checkoutPage.expectLoaded();
  return checkoutPage;
}

test.describe('SauceDemo Error Validation', () => {
  test('TC_ERROR_001 - verify login error styling on required username validation', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.submit();
    await loginPage.expectLoginErrorStyling();
  });

  test('TC_ERROR_002 - verify checkout error is cleared after entering valid data and continuing', async ({ page }) => {
    const checkoutPage = await openCheckoutInformation(page);
    const overviewPage = new CheckoutOverviewPage(page);
    await checkoutPage.continue();
    await checkoutPage.expectError('Error: First Name is required');
    await checkoutPage.fillInformation('John', 'Doe', '12345');
    await checkoutPage.continue();
    await overviewPage.expectLoaded();
  });

  test('TC_ERROR_003 - verify checkout error close button dismisses error', async ({ page }) => {
    const checkoutPage = await openCheckoutInformation(page);
    await checkoutPage.continue();
    await checkoutPage.expectError('Error: First Name is required');
    await checkoutPage.dismissError();
    await checkoutPage.expectErrorDismissed();
  });

  test('TC_ERROR_004 - directly access checkout page without login', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.gotoPath('checkout-step-one.html');
    await loginPage.expectOnLoginPage();
    await loginPage.expectErrorContaining('You can only access');
  });

  test('TC_ERROR_005 - directly access cart page without login', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.gotoPath('cart.html');
    await loginPage.expectOnLoginPage();
    await loginPage.expectErrorContaining('You can only access');
  });

  test('TC_ERROR_006 - use browser back after logout to access protected page', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const inventoryPage = new InventoryPage(page);
    await loginPage.goto();
    await loginPage.login('standard_user', 'secret_sauce');
    await inventoryPage.expectLoaded();
    await inventoryPage.logout();
    await loginPage.expectOnLoginPage();
    await page.goBack();
    await loginPage.expectOnLoginPage();
  });
});
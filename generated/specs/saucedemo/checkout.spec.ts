import { test } from '@playwright/test';
import { LoginPage } from '../pageObjects/LoginPage';
import { InventoryPage } from '../pageObjects/InventoryPage';
import { CartPage } from '../pageObjects/CartPage';
import { CheckoutPage } from '../pageObjects/CheckoutPage';
import { CheckoutOverviewPage } from '../pageObjects/CheckoutOverviewPage';
import { CheckoutCompletePage } from '../pageObjects/CheckoutCompletePage';

async function startCheckout(page: import('@playwright/test').Page, products = ['Sauce Labs Backpack']): Promise<CheckoutPage> {
  const loginPage = new LoginPage(page);
  const inventoryPage = new InventoryPage(page);
  const cartPage = new CartPage(page);
  const checkoutPage = new CheckoutPage(page);
  await loginPage.goto();
  await loginPage.login('standard_user', 'secret_sauce');
  await inventoryPage.expectLoaded();
  for (const product of products) {
    await inventoryPage.addProduct(product);
  }
  await inventoryPage.openCart();
  await cartPage.expectLoaded();
  await cartPage.checkout();
  await checkoutPage.expectLoaded();
  return checkoutPage;
}

async function continueToOverview(page: import('@playwright/test').Page, products = ['Sauce Labs Backpack']): Promise<CheckoutOverviewPage> {
  const checkoutPage = await startCheckout(page, products);
  const overviewPage = new CheckoutOverviewPage(page);
  await checkoutPage.fillInformation('John', 'Doe', '12345');
  await checkoutPage.continue();
  await overviewPage.expectLoaded();
  return overviewPage;
}

test.describe('SauceDemo Checkout', () => {
  test('TC_CHECKOUT_001 - complete checkout with valid customer information', async ({ page }) => {
    const overviewPage = await continueToOverview(page);
    const completePage = new CheckoutCompletePage(page);
    await overviewPage.finish();
    await completePage.expectOrderComplete();
  });

  test('TC_CHECKOUT_002 - verify checkout overview displays correct item details', async ({ page }) => {
    const overviewPage = await continueToOverview(page);
    await overviewPage.expectItem('Sauce Labs Backpack');
  });

  test('TC_CHECKOUT_003 - verify checkout overview total calculation', async ({ page }) => {
    const overviewPage = await continueToOverview(page, ['Sauce Labs Backpack', 'Sauce Labs Bike Light', 'Sauce Labs Bolt T-Shirt']);
    await overviewPage.expectTotalsCalculatedCorrectly();
  });

  test('TC_CHECKOUT_004 - cancel checkout information step', async ({ page }) => {
    const checkoutPage = await startCheckout(page);
    const cartPage = new CartPage(page);
    await checkoutPage.cancel();
    await cartPage.expectLoaded();
  });

  test('TC_CHECKOUT_005 - cancel checkout overview step', async ({ page }) => {
    const overviewPage = await continueToOverview(page);
    const inventoryPage = new InventoryPage(page);
    await overviewPage.cancel();
    await inventoryPage.expectLoaded();
  });

  test('TC_CHECKOUT_006 - return to products after checkout completion', async ({ page }) => {
    const overviewPage = await continueToOverview(page);
    const completePage = new CheckoutCompletePage(page);
    const inventoryPage = new InventoryPage(page);
    await overviewPage.finish();
    await completePage.expectOrderComplete();
    await completePage.backHome();
    await inventoryPage.expectLoaded();
  });

  test('TC_CHECKOUT_007 - submit checkout information with empty first name', async ({ page }) => {
    const checkoutPage = await startCheckout(page);
    await checkoutPage.fillInformation('', 'Doe', '12345');
    await checkoutPage.continue();
    await checkoutPage.expectError('Error: First Name is required');
  });

  test('TC_CHECKOUT_008 - submit checkout information with empty last name', async ({ page }) => {
    const checkoutPage = await startCheckout(page);
    await checkoutPage.fillInformation('John', '', '12345');
    await checkoutPage.continue();
    await checkoutPage.expectError('Error: Last Name is required');
  });

  test('TC_CHECKOUT_009 - submit checkout information with empty postal code', async ({ page }) => {
    const checkoutPage = await startCheckout(page);
    await checkoutPage.fillInformation('John', 'Doe', '');
    await checkoutPage.continue();
    await checkoutPage.expectError('Error: Postal Code is required');
  });

  test('TC_CHECKOUT_010 - submit checkout information with all fields empty', async ({ page }) => {
    const checkoutPage = await startCheckout(page);
    await checkoutPage.continue();
    await checkoutPage.expectError('Error: First Name is required');
  });

  test('TC_CHECKOUT_011 - submit checkout information with special characters', async ({ page }) => {
    const checkoutPage = await startCheckout(page);
    const overviewPage = new CheckoutOverviewPage(page);
    await checkoutPage.fillInformation('!@#$', '%^&*', 'ABC-123');
    await checkoutPage.continue();
    await overviewPage.expectLoaded();
  });

  test('TC_CHECKOUT_012 - submit checkout information with very long field values', async ({ page }) => {
    const checkoutPage = await startCheckout(page);
    const overviewPage = new CheckoutOverviewPage(page);
    const longValue = 'A'.repeat(256);
    await checkoutPage.fillInformation(longValue, longValue, longValue);
    await checkoutPage.continue();
    await overviewPage.expectLoaded();
  });
});
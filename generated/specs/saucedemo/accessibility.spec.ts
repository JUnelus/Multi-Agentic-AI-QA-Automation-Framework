import { expect, test } from '@playwright/test';
import { LoginPage } from '../../page-objects/saucedemo/LoginPage';
import { InventoryPage } from '../../page-objects/saucedemo/InventoryPage';
import { CartPage } from '../../page-objects/saucedemo/CartPage';
import { CheckoutPage } from '../../page-objects/saucedemo/CheckoutPage';
import { CheckoutOverviewPage } from '../../page-objects/saucedemo/CheckoutOverviewPage';
import { CheckoutCompletePage } from '../../page-objects/saucedemo/CheckoutCompletePage';
import { AccessibilityPage } from '../../page-objects/saucedemo/AccessibilityPage';

async function login(page: import('@playwright/test').Page): Promise<InventoryPage> {
  const loginPage = new LoginPage(page);
  const inventoryPage = new InventoryPage(page);
  await loginPage.goto();
  await loginPage.login('standard_user', 'secret_sauce');
  await inventoryPage.expectLoaded();
  return inventoryPage;
}

async function completeCheckout(page: import('@playwright/test').Page): Promise<void> {
  const inventoryPage = await login(page);
  const cartPage = new CartPage(page);
  const checkoutPage = new CheckoutPage(page);
  const overviewPage = new CheckoutOverviewPage(page);
  const completePage = new CheckoutCompletePage(page);
  await inventoryPage.addProduct('Sauce Labs Backpack');
  await inventoryPage.openCart();
  await cartPage.checkout();
  await checkoutPage.fillInformation('John', 'Doe', '12345');
  await checkoutPage.continue();
  await overviewPage.finish();
  await completePage.expectLoaded();
}

test.describe('SauceDemo Accessibility', () => {
  test('TC_ACCESS_001 - verify login page supports keyboard-only navigation', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await page.keyboard.press('Tab');
    await expect(loginPage.usernameInput).toBeFocused();
    await page.keyboard.type('standard_user');
    await page.keyboard.press('Tab');
    await expect(loginPage.passwordInput).toBeFocused();
    await page.keyboard.type('secret_sauce');
    await page.keyboard.press('Tab');
    await expect(loginPage.loginButton).toBeFocused();
    await page.keyboard.press('Enter');
    await new InventoryPage(page).expectLoaded();
  });

  test('TC_ACCESS_002 - verify inventory page supports keyboard navigation', async ({ page }) => {
    const inventoryPage = await login(page);
    await page.keyboard.press('Tab');
    await expect(inventoryPage.menuButton).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(inventoryPage.cartLink).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(inventoryPage.sortDropdown).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-test=inventory-item-name]').first()).toBeFocused();
  });

  test('TC_ACCESS_003 - verify cart and checkout pages support keyboard-only flow', async ({ page }) => {
    const inventoryPage = await login(page);
    const cartPage = new CartPage(page);
    const checkoutPage = new CheckoutPage(page);
    const overviewPage = new CheckoutOverviewPage(page);
    const completePage = new CheckoutCompletePage(page);
    await inventoryPage.addProduct('Sauce Labs Backpack');
    await inventoryPage.cartLink.focus();
    await page.keyboard.press('Enter');
    await cartPage.expectLoaded();
    await cartPage.checkoutButton.focus();
    await page.keyboard.press('Enter');
    await checkoutPage.expectLoaded();
    await checkoutPage.firstNameInput.focus();
    await page.keyboard.type('John');
    await page.keyboard.press('Tab');
    await page.keyboard.type('Doe');
    await page.keyboard.press('Tab');
    await page.keyboard.type('12345');
    await checkoutPage.continueButton.focus();
    await page.keyboard.press('Enter');
    await overviewPage.expectLoaded();
    await overviewPage.finishButton.focus();
    await page.keyboard.press('Enter');
    await completePage.expectLoaded();
  });

  test('TC_ACCESS_004 - verify form fields have accessible names', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.expectFormFieldsHaveAccessibleNames();
    await login(page);
    await new InventoryPage(page).addProduct('Sauce Labs Backpack');
    await new InventoryPage(page).openCart();
    await new CartPage(page).checkout();
    await new CheckoutPage(page).expectFormFieldsHaveAccessibleNames();
  });

  test('TC_ACCESS_005 - verify buttons and links have accessible names', async ({ page }) => {
    const inventoryPage = await login(page);
    await expect(inventoryPage.menuButton).toHaveAccessibleName(/Open Menu/i);
    await expect(inventoryPage.cartLink).toHaveAccessibleName(/Shopping Cart/i);
    await expect(inventoryPage.productByName('Sauce Labs Backpack').getByRole('button', { name: 'Add to cart' })).toBeVisible();
    await inventoryPage.addProduct('Sauce Labs Backpack');
    await expect(inventoryPage.productByName('Sauce Labs Backpack').getByRole('button', { name: 'Remove' })).toBeVisible();
    await inventoryPage.openCart();
    await expect(new CartPage(page).checkoutButton).toHaveAccessibleName('Checkout');
  });

  test('TC_ACCESS_006 - verify product images have appropriate alternative text', async ({ page }) => {
    const inventoryPage = await login(page);
    await inventoryPage.expectAllProductImagesHaveAccessibleAlternatives();
  });

  test('TC_ACCESS_007 - verify color contrast on major pages with automated scan', async ({ page }) => {
    const accessibilityPage = new AccessibilityPage(page);
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await accessibilityPage.expectNoCriticalOrSeriousViolations();
    const inventoryPage = await login(page);
    await accessibilityPage.expectNoCriticalOrSeriousViolations();
    await inventoryPage.openCart();
    await accessibilityPage.expectNoCriticalOrSeriousViolations();
    await new CartPage(page).checkout();
    await accessibilityPage.expectNoCriticalOrSeriousViolations();
  });

  test('TC_ACCESS_009 - verify page headings are structured correctly', async ({ page }) => {
    const accessibilityPage = new AccessibilityPage(page);
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await expect(page.locator('.login_logo')).toHaveText('Swag Labs');
    const inventoryPage = await login(page);
    await accessibilityPage.expectHeadingStructureHasPageHeading('Products');
    await inventoryPage.openCart();
    await accessibilityPage.expectHeadingStructureHasPageHeading('Your Cart');
    await new CartPage(page).checkout();
    await accessibilityPage.expectHeadingStructureHasPageHeading('Checkout: Your Information');
  });

  test('TC_ACCESS_011 - verify menu drawer accessibility', async ({ page }) => {
    const inventoryPage = await login(page);
    await inventoryPage.menuButton.focus();
    await page.keyboard.press('Enter');
    await expect(inventoryPage.logoutLink).toBeVisible();
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-test=inventory-sidebar-link]')).toBeFocused();
    await inventoryPage.menuCloseButton.focus();
    await page.keyboard.press('Enter');
    await expect(inventoryPage.logoutLink).toBeHidden();
  });

  test('TC_ACCESS_012 - run automated accessibility scan on checkout completion page', async ({ page }) => {
    await completeCheckout(page);
    await new AccessibilityPage(page).expectNoCriticalOrSeriousViolations();
  });
});
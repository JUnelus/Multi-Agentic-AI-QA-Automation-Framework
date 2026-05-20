import { test, expect, Page } from '@playwright/test';
import { LoginPage } from '../pageObjects/LoginPage';
import { InventoryPage } from '../pageObjects/InventoryPage';
import { ProductDetailsPage } from '../pageObjects/ProductDetailsPage';
import { CartPage } from '../pageObjects/CartPage';
import { CheckoutPage } from '../pageObjects/CheckoutPage';
import { CheckoutOverviewPage } from '../pageObjects/CheckoutOverviewPage';
import { CheckoutCompletePage } from '../pageObjects/CheckoutCompletePage';
import { AccessibilityScan } from '../pageObjects/AccessibilityScan';

const validUser = 'standard_user';
const validPassword = 'secret_sauce';
const backpack = 'Sauce Labs Backpack';
const bikeLight = 'Sauce Labs Bike Light';
const expectedProducts = [
  'Sauce Labs Backpack',
  'Sauce Labs Bike Light',
  'Sauce Labs Bolt T-Shirt',
  'Sauce Labs Fleece Jacket',
  'Sauce Labs Onesie',
  'Test.allTheThings() T-Shirt (Red)'
];

async function loginAsStandardUser(page: Page): Promise<InventoryPage> {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login(validUser, validPassword);
  const inventoryPage = new InventoryPage(page);
  await inventoryPage.expectLoaded();
  return inventoryPage;
}

async function startCheckoutWithProducts(page: Page, products = [backpack]): Promise<CheckoutPage> {
  const inventoryPage = await loginAsStandardUser(page);
  await inventoryPage.addProducts(products);
  await inventoryPage.openCart();
  const cartPage = new CartPage(page);
  await cartPage.expectLoaded();
  await cartPage.checkout();
  const checkoutPage = new CheckoutPage(page);
  await checkoutPage.expectLoaded();
  return checkoutPage;
}

function expectAscending<T>(values: T[]): void {
  expect(values).toEqual([...values].sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true })));
}

function expectDescending<T>(values: T[]): void {
  expect(values).toEqual([...values].sort((a, b) => String(b).localeCompare(String(a), undefined, { numeric: true })));
}

test.describe('Login', () => {
  test('TC_LOGIN_001 Login with valid standard user credentials', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(validUser, validPassword);
    await new InventoryPage(page).expectLoaded();
  });

  test('TC_LOGIN_002 Login with locked out user', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('locked_out_user', validPassword);
    await loginPage.expectLoginPageVisible();
    await loginPage.expectErrorMessage('locked out');
  });

  test('TC_LOGIN_003 Login with invalid username and valid password', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('invalid_user', validPassword);
    await loginPage.expectLoginPageVisible();
    await loginPage.expectErrorMessage('Username and password do not match');
  });

  test('TC_LOGIN_004 Login with valid username and invalid password', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(validUser, 'invalid_password');
    await loginPage.expectLoginPageVisible();
    await loginPage.expectErrorMessage('Username and password do not match');
  });

  test('TC_LOGIN_005 Login with empty username and password', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.submit();
    await loginPage.expectLoginPageVisible();
    await loginPage.expectErrorMessage('Username is required');
  });

  test('TC_LOGIN_006 Login with empty password', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.usernameInput.fill(validUser);
    await loginPage.submit();
    await loginPage.expectLoginPageVisible();
    await loginPage.expectErrorMessage('Password is required');
  });

  test('TC_LOGIN_007 Login with leading and trailing spaces in credentials', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(` ${validUser} `, validPassword);
    await loginPage.expectLoginPageVisible();
    await loginPage.expectErrorMessage('Username and password do not match');
  });

  test('TC_LOGIN_008 Verify logout returns user to login page', async ({ page }) => {
    const inventoryPage = await loginAsStandardUser(page);
    await inventoryPage.logout();
    await new LoginPage(page).expectLoginPageVisible();
  });
});

test.describe('Inventory', () => {
  test('TC_INVENTORY_001 Verify inventory page loads after successful login', async ({ page }) => {
    const inventoryPage = await loginAsStandardUser(page);
    await inventoryPage.expectLoaded();
  });

  test('TC_INVENTORY_002 Verify all expected products are displayed', async ({ page }) => {
    const inventoryPage = await loginAsStandardUser(page);
    await inventoryPage.expectAllExpectedProductsDisplayed(expectedProducts);
  });

  test('TC_INVENTORY_003 Sort products by name A to Z', async ({ page }) => {
    const inventoryPage = await loginAsStandardUser(page);
    await inventoryPage.selectSort('az');
    expectAscending(await inventoryPage.getProductNames());
  });

  test('TC_INVENTORY_004 Sort products by name Z to A', async ({ page }) => {
    const inventoryPage = await loginAsStandardUser(page);
    await inventoryPage.selectSort('za');
    expectDescending(await inventoryPage.getProductNames());
  });

  test('TC_INVENTORY_005 Sort products by price low to high', async ({ page }) => {
    const inventoryPage = await loginAsStandardUser(page);
    await inventoryPage.selectSort('lohi');
    const prices = await inventoryPage.getProductPrices();
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
  });

  test('TC_INVENTORY_006 Sort products by price high to low', async ({ page }) => {
    const inventoryPage = await loginAsStandardUser(page);
    await inventoryPage.selectSort('hilo');
    const prices = await inventoryPage.getProductPrices();
    expect(prices).toEqual([...prices].sort((a, b) => b - a));
  });

  test('TC_INVENTORY_007 Open product details from inventory item name', async ({ page }) => {
    const inventoryPage = await loginAsStandardUser(page);
    await inventoryPage.openProductDetails(backpack);
    await new ProductDetailsPage(page).expectLoadedForProduct(backpack);
  });

  test('TC_INVENTORY_008 Add single product to cart from inventory page', async ({ page }) => {
    const inventoryPage = await loginAsStandardUser(page);
    await inventoryPage.addProduct(backpack);
    await inventoryPage.expectCartBadgeCount(1);
    await inventoryPage.expectProductButton(backpack, 'Remove');
  });

  test('TC_INVENTORY_009 Remove product from inventory page after adding it', async ({ page }) => {
    const inventoryPage = await loginAsStandardUser(page);
    await inventoryPage.addProduct(backpack);
    await inventoryPage.removeProduct(backpack);
    await inventoryPage.expectCartBadgeCount(0);
    await inventoryPage.expectProductButton(backpack, 'Add to cart');
  });

  test('TC_INVENTORY_010 Verify inventory page cannot be accessed without authentication', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.gotoPath('/inventory.html');
    await loginPage.expectLoginPageVisible();
    await loginPage.expectErrorMessage('You can only access');
  });
});

test.describe('Cart', () => {
  test('TC_CART_001 Add multiple products to cart', async ({ page }) => {
    const inventoryPage = await loginAsStandardUser(page);
    await inventoryPage.addProducts([backpack, bikeLight]);
    await inventoryPage.expectCartBadgeCount(2);
  });

  test('TC_CART_002 Navigate to cart from inventory page', async ({ page }) => {
    const inventoryPage = await loginAsStandardUser(page);
    await inventoryPage.addProduct(backpack);
    await inventoryPage.openCart();
    const cartPage = new CartPage(page);
    await cartPage.expectLoaded();
    await cartPage.expectProductVisible(backpack);
  });

  test('TC_CART_003 Verify cart item details match inventory item details', async ({ page }) => {
    const inventoryPage = await loginAsStandardUser(page);
    const inventoryDetails = await inventoryPage.getProductDetails(backpack);
    await inventoryPage.addProduct(backpack);
    await inventoryPage.openCart();
    const cartDetails = await new CartPage(page).getCartItemDetails(backpack);
    expect(cartDetails).toEqual(inventoryDetails);
  });

  test('TC_CART_004 Remove product from cart page', async ({ page }) => {
    const inventoryPage = await loginAsStandardUser(page);
    await inventoryPage.addProduct(backpack);
    await inventoryPage.openCart();
    const cartPage = new CartPage(page);
    await cartPage.removeProduct(backpack);
    await cartPage.expectEmpty();
  });

  test('TC_CART_005 Continue shopping from cart page', async ({ page }) => {
    const inventoryPage = await loginAsStandardUser(page);
    await inventoryPage.openCart();
    const cartPage = new CartPage(page);
    await cartPage.continueShopping();
    await new InventoryPage(page).expectLoaded();
  });

  test('TC_CART_006 Open cart with no items', async ({ page }) => {
    const inventoryPage = await loginAsStandardUser(page);
    await inventoryPage.openCart();
    const cartPage = new CartPage(page);
    await cartPage.expectLoaded();
    await cartPage.expectEmpty();
  });

  test('TC_CART_007 Verify cart contents persist after page refresh', async ({ page }) => {
    const inventoryPage = await loginAsStandardUser(page);
    await inventoryPage.addProducts([backpack, bikeLight]);
    await inventoryPage.openCart();
    const cartPage = new CartPage(page);
    await page.reload();
    await cartPage.expectLoaded();
    await cartPage.expectProductVisible(backpack);
    await cartPage.expectProductVisible(bikeLight);
    await cartPage.expectCartBadgeCount(2);
  });
});

test.describe('Checkout', () => {
  test('TC_CHECKOUT_001 Start checkout from cart with product', async ({ page }) => {
    await startCheckoutWithProducts(page, [backpack]);
  });

  test('TC_CHECKOUT_002 Complete checkout with valid customer information', async ({ page }) => {
    const checkoutPage = await startCheckoutWithProducts(page, [backpack]);
    await checkoutPage.completeInformation('John', 'Doe', '12345');
    const overviewPage = new CheckoutOverviewPage(page);
    await overviewPage.expectLoaded();
    await overviewPage.finish();
    await new CheckoutCompletePage(page).expectLoaded();
  });

  test('TC_CHECKOUT_003 Verify checkout overview totals', async ({ page }) => {
    const checkoutPage = await startCheckoutWithProducts(page, [backpack, bikeLight]);
    await checkoutPage.completeInformation('John', 'Doe', '12345');
    const overviewPage = new CheckoutOverviewPage(page);
    await overviewPage.expectLoaded();
    await overviewPage.expectTotalsAreCorrect();
  });

  test('TC_CHECKOUT_004 Cancel checkout from information page', async ({ page }) => {
    const checkoutPage = await startCheckoutWithProducts(page, [backpack]);
    await checkoutPage.cancel();
    await new CartPage(page).expectLoaded();
  });

  test('TC_CHECKOUT_005 Cancel checkout from overview page', async ({ page }) => {
    const checkoutPage = await startCheckoutWithProducts(page, [backpack]);
    await checkoutPage.completeInformation('John', 'Doe', '12345');
    const overviewPage = new CheckoutOverviewPage(page);
    await overviewPage.cancel();
    const inventoryPage = new InventoryPage(page);
    await inventoryPage.expectLoaded();
    await inventoryPage.expectCartBadgeCount(1);
  });

  test('TC_CHECKOUT_006 Return to products after order completion', async ({ page }) => {
    const checkoutPage = await startCheckoutWithProducts(page, [backpack]);
    await checkoutPage.completeInformation('John', 'Doe', '12345');
    const overviewPage = new CheckoutOverviewPage(page);
    await overviewPage.finish();
    const completePage = new CheckoutCompletePage(page);
    await completePage.expectLoaded();
    await completePage.backHome();
    await new InventoryPage(page).expectLoaded();
  });

  test('TC_CHECKOUT_007 Attempt checkout with empty cart', async ({ page }) => {
    const inventoryPage = await loginAsStandardUser(page);
    await inventoryPage.openCart();
    const cartPage = new CartPage(page);
    await cartPage.expectEmpty();
    await cartPage.checkout();
    await expect(page).toHaveURL(/cart.html|checkout-step-one.html/);
  });
});

test.describe('Error validation', () => {
  test('TC_ERROR_001 Checkout information validation when first name is empty', async ({ page }) => {
    const checkoutPage = await startCheckoutWithProducts(page, [backpack]);
    await checkoutPage.fillInformation('', 'Doe', '12345');
    await checkoutPage.continue();
    await checkoutPage.expectLoaded();
    await checkoutPage.expectErrorMessage('First Name is required');
  });

  test('TC_ERROR_002 Checkout information validation when last name is empty', async ({ page }) => {
    const checkoutPage = await startCheckoutWithProducts(page, [backpack]);
    await checkoutPage.fillInformation('John', '', '12345');
    await checkoutPage.continue();
    await checkoutPage.expectLoaded();
    await checkoutPage.expectErrorMessage('Last Name is required');
  });

  test('TC_ERROR_003 Checkout information validation when postal code is empty', async ({ page }) => {
    const checkoutPage = await startCheckoutWithProducts(page, [backpack]);
    await checkoutPage.fillInformation('John', 'Doe', '');
    await checkoutPage.continue();
    await checkoutPage.expectLoaded();
    await checkoutPage.expectErrorMessage('Postal Code is required');
  });

  test('TC_ERROR_004 Dismiss login error message', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.submit();
    await loginPage.expectErrorMessage('Username is required');
    await loginPage.dismissError();
  });

  test('TC_ERROR_005 Direct access to cart page without login', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.gotoPath('/cart.html');
    await loginPage.expectLoginPageVisible();
    await loginPage.expectErrorMessage('You can only access');
  });

  test('TC_ERROR_006 Direct access to checkout step one without login', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.gotoPath('/checkout-step-one.html');
    await loginPage.expectLoginPageVisible();
    await loginPage.expectErrorMessage('You can only access');
  });

  test('TC_ERROR_007 Checkout form accepts special characters in name fields', async ({ page }) => {
    const checkoutPage = await startCheckoutWithProducts(page, [backpack]);
    await checkoutPage.completeInformation('!@#$%^&*()', '<Doe>', '12345');
    await new CheckoutOverviewPage(page).expectLoaded();
  });

  test('TC_ERROR_008 Checkout form accepts very long input values', async ({ page }) => {
    const checkoutPage = await startCheckoutWithProducts(page, [backpack]);
    const longValue = 'A'.repeat(500);
    await checkoutPage.completeInformation(longValue, longValue, longValue);
    await new CheckoutOverviewPage(page).expectLoaded();
  });
});

test.describe('Accessibility', () => {
  test('TC_ACCESSIBILITY_001 Verify login page form fields have accessible names', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.expectFormFieldsHaveAccessibleNames();
    await AccessibilityScan.expectNoCriticalViolations(page);
  });

  test('TC_ACCESSIBILITY_002 Verify keyboard-only login flow', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await page.keyboard.press('Tab');
    await page.keyboard.type(validUser);
    await page.keyboard.press('Tab');
    await page.keyboard.type(validPassword);
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    await new InventoryPage(page).expectLoaded();
  });

  test('TC_ACCESSIBILITY_004 Verify inventory product images have accessible alternatives', async ({ page }) => {
    const inventoryPage = await loginAsStandardUser(page);
    await inventoryPage.expectAllProductImagesHaveAccessibleAlternatives();
  });

  test('TC_ACCESSIBILITY_005 Verify color contrast on login and inventory pages', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await AccessibilityScan.expectNoWcagAAViolations(page);
    await loginPage.login(validUser, validPassword);
    await new InventoryPage(page).expectLoaded();
    await AccessibilityScan.expectNoWcagAAViolations(page);
  });

  test('TC_ACCESSIBILITY_006 Verify cart and checkout pages support keyboard navigation', async ({ page }) => {
    const inventoryPage = await loginAsStandardUser(page);
    await inventoryPage.addProduct(backpack);
    await inventoryPage.cartLink.focus();
    await page.keyboard.press('Enter');
    const cartPage = new CartPage(page);
    await cartPage.expectLoaded();
    await cartPage.checkoutButton.focus();
    await page.keyboard.press('Enter');
    const checkoutPage = new CheckoutPage(page);
    await checkoutPage.expectLoaded();
    await checkoutPage.firstNameInput.focus();
    await page.keyboard.type('John');
    await page.keyboard.press('Tab');
    await page.keyboard.type('Doe');
    await page.keyboard.press('Tab');
    await page.keyboard.type('12345');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    const overviewPage = new CheckoutOverviewPage(page);
    await overviewPage.expectLoaded();
    await overviewPage.finishButton.focus();
    await page.keyboard.press('Enter');
    await new CheckoutCompletePage(page).expectLoaded();
  });

  test('TC_ACCESSIBILITY_010 Verify menu can be opened and closed with keyboard', async ({ page }) => {
    const inventoryPage = await loginAsStandardUser(page);
    await inventoryPage.menuButton.focus();
    await page.keyboard.press('Enter');
    await expect(inventoryPage.logoutLink).toBeVisible();
    await inventoryPage.menuCloseButton.focus();
    await page.keyboard.press('Enter');
    await expect(inventoryPage.logoutLink).toBeHidden();
  });
});

import { test } from '@playwright/test';
import { LoginPage } from './LoginPage';
import { InventoryPage } from './InventoryPage';
import { CartPage } from './CartPage';
import { CheckoutPage } from './CheckoutPage';

const USERS = {
  standard: 'standard_user',
  lockedOut: 'locked_out_user'
} as const;

const PASSWORD = 'secret_sauce';

async function loginAsStandardUser(page: Parameters<typeof LoginPage>[0]): Promise<void> {
  const loginPage = new LoginPage(page);
  const inventoryPage = new InventoryPage(page);

  await loginPage.goto();
  await loginPage.login(USERS.standard, PASSWORD);
  await inventoryPage.expectLoaded();
}

test.describe('SauceDemo', () => {
  test('TC_LOGIN_001 - Login with valid standard user', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const inventoryPage = new InventoryPage(page);

    await loginPage.goto();
    await loginPage.expectLoginPageVisible();
    await loginPage.login(USERS.standard, PASSWORD);

    await inventoryPage.expectLoaded();
  });

  test('TC_LOGIN_002 - Locked out user should see error', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.expectLoginPageVisible();
    await loginPage.login(USERS.lockedOut, PASSWORD);

    await loginPage.expectLockedOutErrorVisible();
  });

  test('TC_CART_001 - Add backpack to cart', async ({ page }) => {
    const inventoryPage = new InventoryPage(page);
    const cartPage = new CartPage(page);

    await loginAsStandardUser(page);
    await inventoryPage.addBackpackToCart();
    await inventoryPage.expectCartItemCount(1);
    await inventoryPage.openCart();

    await cartPage.expectLoaded();
    await cartPage.expectBackpackInCart();
  });

  test('TC_CHECKOUT_001 - Complete checkout successfully', async ({ page }) => {
    const inventoryPage = new InventoryPage(page);
    const cartPage = new CartPage(page);
    const checkoutPage = new CheckoutPage(page);

    await loginAsStandardUser(page);
    await inventoryPage.addBackpackToCart();
    await inventoryPage.openCart();
    await cartPage.expectLoaded();
    await cartPage.expectBackpackInCart();
    await cartPage.proceedToCheckout();

    await checkoutPage.expectCustomerInfoPageLoaded();
    await checkoutPage.enterCustomerInfo({
      firstName: 'Test',
      lastName: 'User',
      postalCode: '12345'
    });
    await checkoutPage.continueToOverview();
    await checkoutPage.expectOverviewPageLoaded();
    await checkoutPage.finishOrder();

    await checkoutPage.expectOrderConfirmationDisplayed();
  });
});
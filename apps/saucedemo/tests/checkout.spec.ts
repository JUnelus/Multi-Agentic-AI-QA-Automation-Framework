import { test } from '@playwright/test';
import { CartPage } from '../pages/CartPage';
import { CheckoutPage } from '../pages/CheckoutPage';
import { InventoryPage } from '../pages/InventoryPage';
import { LoginPage } from '../pages/LoginPage';

test.describe('SauceDemo Checkout Tests', () => {
  test('TC_CHECKOUT_001 - Complete checkout successfully', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const inventoryPage = new InventoryPage(page);
    const cartPage = new CartPage(page);
    const checkoutPage = new CheckoutPage(page);

    await loginPage.goto();
    await loginPage.login('standard_user', 'secret_sauce');

    await inventoryPage.addBackpackToCart();
    await inventoryPage.openCart();

    await cartPage.continueToCheckout();

    await checkoutPage.enterCustomerInfo('Jimmy', 'Unelus', '10001');
    await checkoutPage.finishOrder();
    await checkoutPage.verifyOrderConfirmation();
  });

  test('TC_CHECKOUT_002 - Missing postal code validation', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const inventoryPage = new InventoryPage(page);
    const cartPage = new CartPage(page);
    const checkoutPage = new CheckoutPage(page);

    await loginPage.goto();
    await loginPage.login('standard_user', 'secret_sauce');

    await inventoryPage.addBackpackToCart();
    await inventoryPage.openCart();

    await cartPage.continueToCheckout();

    await checkoutPage.enterCustomerInfo('Jimmy', 'Unelus', '');
    await checkoutPage.verifyCheckoutError('Postal Code is required');
  });
});


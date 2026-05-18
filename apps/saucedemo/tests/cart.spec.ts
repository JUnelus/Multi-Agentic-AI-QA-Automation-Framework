import { test } from '@playwright/test';
import { CartPage } from '../pages/CartPage';
import { InventoryPage } from '../pages/InventoryPage';
import { LoginPage } from '../pages/LoginPage';

test.describe('SauceDemo Cart Tests', () => {
  test('TC_CART_001 - Add backpack to cart', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const inventoryPage = new InventoryPage(page);
    const cartPage = new CartPage(page);

    await loginPage.goto();
    await loginPage.login('standard_user', 'secret_sauce');

    await inventoryPage.addBackpackToCart();
    await inventoryPage.openCart();

    await cartPage.verifyItemInCart('Sauce Labs Backpack');
  });
});


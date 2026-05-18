import { test } from '@playwright/test';
import { LoginPage } from '../pageObjects/LoginPage';
import { InventoryPage } from '../pageObjects/InventoryPage';
import { CartPage } from '../pageObjects/CartPage';
import { CheckoutPage } from '../pageObjects/CheckoutPage';

async function loginAndOpenInventory(page: import('@playwright/test').Page): Promise<InventoryPage> {
  const loginPage = new LoginPage(page);
  const inventoryPage = new InventoryPage(page);
  await loginPage.goto();
  await loginPage.login('standard_user', 'secret_sauce');
  await inventoryPage.expectLoaded();
  return inventoryPage;
}

test.describe('SauceDemo Cart', () => {
  test('TC_CART_001 - open cart page from inventory', async ({ page }) => {
    const inventoryPage = await loginAndOpenInventory(page);
    const cartPage = new CartPage(page);
    await inventoryPage.openCart();
    await cartPage.expectLoaded();
  });

  test('TC_CART_002 - verify added product appears in cart', async ({ page }) => {
    const inventoryPage = await loginAndOpenInventory(page);
    const cartPage = new CartPage(page);
    await inventoryPage.addProduct('Sauce Labs Backpack');
    await inventoryPage.openCart();
    await cartPage.expectLoaded();
    await cartPage.expectItem('Sauce Labs Backpack');
  });

  test('TC_CART_003 - remove item from cart page', async ({ page }) => {
    const inventoryPage = await loginAndOpenInventory(page);
    const cartPage = new CartPage(page);
    await inventoryPage.addProduct('Sauce Labs Backpack');
    await inventoryPage.openCart();
    await cartPage.expectItem('Sauce Labs Backpack');
    await cartPage.removeProduct('Sauce Labs Backpack');
    await cartPage.expectItemRemoved('Sauce Labs Backpack');
    await cartPage.expectCartBadgeHidden();
  });

  test('TC_CART_004 - continue shopping from cart', async ({ page }) => {
    const inventoryPage = await loginAndOpenInventory(page);
    const cartPage = new CartPage(page);
    await inventoryPage.openCart();
    await cartPage.expectLoaded();
    await cartPage.continueShopping();
    await inventoryPage.expectLoaded();
  });

  test('TC_CART_005 - proceed to checkout from cart with item', async ({ page }) => {
    const inventoryPage = await loginAndOpenInventory(page);
    const cartPage = new CartPage(page);
    const checkoutPage = new CheckoutPage(page);
    await inventoryPage.addProduct('Sauce Labs Backpack');
    await inventoryPage.openCart();
    await cartPage.checkout();
    await checkoutPage.expectLoaded();
  });

  test('TC_CART_006 - proceed to checkout with empty cart', async ({ page }) => {
    const inventoryPage = await loginAndOpenInventory(page);
    const cartPage = new CartPage(page);
    const checkoutPage = new CheckoutPage(page);
    await inventoryPage.openCart();
    await cartPage.expectLoaded();
    await cartPage.checkout();
    await checkoutPage.expectLoaded();
  });

  test('TC_CART_007 - verify cart item quantity is displayed as one per unique product', async ({ page }) => {
    const inventoryPage = await loginAndOpenInventory(page);
    const cartPage = new CartPage(page);
    await inventoryPage.addProduct('Sauce Labs Backpack');
    await inventoryPage.addProduct('Sauce Labs Bike Light');
    await inventoryPage.addProduct('Sauce Labs Bolt T-Shirt');
    await inventoryPage.openCart();
    await cartPage.expectLoaded();
    await cartPage.expectAllItemQuantitiesAreOne();
  });
});
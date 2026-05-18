import { expect, test } from '@playwright/test';
import { LoginPage } from '../pageObjects/LoginPage';
import { InventoryPage } from '../pageObjects/InventoryPage';
import { ProductDetailsPage } from '../pageObjects/ProductDetailsPage';

const products = ['Sauce Labs Backpack', 'Sauce Labs Bike Light', 'Sauce Labs Bolt T-Shirt'];

test.describe('SauceDemo Inventory', () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    const inventoryPage = new InventoryPage(page);
    await loginPage.goto();
    await loginPage.login('standard_user', 'secret_sauce');
    await inventoryPage.expectLoaded();
  });

  test('TC_INV_001 - verify inventory page loads with product list', async ({ page }) => {
    await new InventoryPage(page).expectProductListDetails();
  });

  test('TC_INV_002 - add a product to cart from inventory page', async ({ page }) => {
    const inventoryPage = new InventoryPage(page);
    await inventoryPage.addProduct('Sauce Labs Backpack');
    await inventoryPage.expectProductButton('Sauce Labs Backpack', 'Remove');
    await inventoryPage.expectCartBadge(1);
  });

  test('TC_INV_003 - remove a product from inventory page', async ({ page }) => {
    const inventoryPage = new InventoryPage(page);
    await inventoryPage.addProduct('Sauce Labs Backpack');
    await inventoryPage.expectCartBadge(1);
    await inventoryPage.removeProduct('Sauce Labs Backpack');
    await inventoryPage.expectProductButton('Sauce Labs Backpack', 'Add to cart');
    await inventoryPage.expectCartBadgeHidden();
  });

  test('TC_INV_004 - add multiple products to cart', async ({ page }) => {
    const inventoryPage = new InventoryPage(page);
    for (const product of products) {
      await inventoryPage.addProduct(product);
      await inventoryPage.expectProductButton(product, 'Remove');
    }
    await inventoryPage.expectCartBadge(3);
  });

  test('TC_INV_005 - open product details page from product name', async ({ page }) => {
    const inventoryPage = new InventoryPage(page);
    const productDetailsPage = new ProductDetailsPage(page);
    await inventoryPage.openProduct('Sauce Labs Backpack');
    await productDetailsPage.expectLoadedFor('Sauce Labs Backpack');
  });

  test('TC_INV_006 - return to inventory from product details page', async ({ page }) => {
    const inventoryPage = new InventoryPage(page);
    const productDetailsPage = new ProductDetailsPage(page);
    await inventoryPage.openProduct('Sauce Labs Backpack');
    await productDetailsPage.expectLoadedFor('Sauce Labs Backpack');
    await productDetailsPage.backToProducts();
    await inventoryPage.expectLoaded();
  });

  test('TC_INV_007 - sort products by name ascending', async ({ page }) => {
    const inventoryPage = new InventoryPage(page);
    await inventoryPage.sortBy('az');
    const names = await inventoryPage.getProductNames();
    expect(names).toEqual([...names].sort());
  });

  test('TC_INV_008 - sort products by name descending', async ({ page }) => {
    const inventoryPage = new InventoryPage(page);
    await inventoryPage.sortBy('za');
    const names = await inventoryPage.getProductNames();
    expect(names).toEqual([...names].sort().reverse());
  });

  test('TC_INV_009 - sort products by price low to high', async ({ page }) => {
    const inventoryPage = new InventoryPage(page);
    await inventoryPage.sortBy('lohi');
    const prices = await inventoryPage.getProductPrices();
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
  });

  test('TC_INV_010 - sort products by price high to low', async ({ page }) => {
    const inventoryPage = new InventoryPage(page);
    await inventoryPage.sortBy('hilo');
    const prices = await inventoryPage.getProductPrices();
    expect(prices).toEqual([...prices].sort((a, b) => b - a));
  });

  test('TC_INV_011 - verify cart badge is not shown when cart is empty', async ({ page }) => {
    await new InventoryPage(page).expectCartBadgeHidden();
  });

  test('TC_INV_012 - verify selected cart items persist after page refresh', async ({ page }) => {
    const inventoryPage = new InventoryPage(page);
    await inventoryPage.addProduct('Sauce Labs Backpack');
    await inventoryPage.addProduct('Sauce Labs Bike Light');
    await inventoryPage.expectCartBadge(2);
    await page.reload();
    await inventoryPage.expectLoaded();
    await inventoryPage.expectCartBadge(2);
    await inventoryPage.expectProductButton('Sauce Labs Backpack', 'Remove');
    await inventoryPage.expectProductButton('Sauce Labs Bike Light', 'Remove');
  });
});
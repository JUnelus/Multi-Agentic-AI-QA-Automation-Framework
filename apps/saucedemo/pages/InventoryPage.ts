import { expect, Page } from '@playwright/test';

export class InventoryPage {
  constructor(private readonly page: Page) {}

  async verifyInventoryPageLoaded() {
    await expect(this.page.locator('[data-test="inventory-container"]')).toBeVisible();
  }

  async addBackpackToCart() {
    await this.page.locator('[data-test="add-to-cart-sauce-labs-backpack"]').click();
  }

  async openCart() {
    await this.page.locator('[data-test="shopping-cart-link"]').click();
    // The cart is a client-side route; wait for it to replace the inventory
    // list before callers assert on cart items.
    await expect(this.page).toHaveURL(/\/cart\.html$/);
    await expect(this.page.locator('[data-test="cart-list"]')).toBeVisible();
  }
}


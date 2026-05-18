import { expect, Page } from '@playwright/test';

export class CartPage {
  constructor(private readonly page: Page) {}

  async verifyItemInCart(itemName: string) {
    await expect(this.page.locator('[data-test="inventory-item-name"]')).toContainText(itemName);
  }

  async continueToCheckout() {
    await this.page.locator('[data-test="checkout"]').click();
  }
}


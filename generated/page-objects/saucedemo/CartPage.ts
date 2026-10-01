import { expect, Locator, Page } from '@playwright/test';
import type { ProductDetails } from './InventoryPage';

export class CartPage {
  readonly page: Page;
  readonly title: Locator;
  readonly cartItems: Locator;
  readonly continueShoppingButton: Locator;
  readonly checkoutButton: Locator;
  readonly cartBadge: Locator;

  constructor(page: Page) {
    this.page = page;
    this.title = page.locator('[data-test="title"]');
    this.cartItems = page.locator('[data-test="inventory-item"]');
    this.continueShoppingButton = page.locator('[data-test="continue-shopping"]');
    this.checkoutButton = page.locator('[data-test="checkout"]');
    this.cartBadge = page.locator('[data-test="shopping-cart-badge"]');
  }

  itemByName(name: string): Locator {
    return this.cartItems.filter({ hasText: name });
  }

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/cart.html/);
    await expect(this.title).toHaveText('Your Cart');
    await expect(this.checkoutButton).toBeVisible();
    await expect(this.continueShoppingButton).toBeVisible();
  }

  async expectEmpty(): Promise<void> {
    await expect(this.cartItems).toHaveCount(0);
    await expect(this.cartBadge).toBeHidden();
  }

  async expectProductVisible(name: string): Promise<void> {
    await expect(this.itemByName(name)).toBeVisible();
  }

  async getCartItemDetails(name: string): Promise<ProductDetails> {
    const item = this.itemByName(name);
    return {
      name: (await item.locator('[data-test="inventory-item-name"]').innerText()).trim(),
      description: (await item.locator('[data-test="inventory-item-desc"]').innerText()).trim(),
      price: Number((await item.locator('[data-test="inventory-item-price"]').innerText()).replace('$', '').trim())
    };
  }

  async removeProduct(name: string): Promise<void> {
    await this.itemByName(name).getByRole('button', { name: 'Remove' }).click();
  }

  async expectCartBadgeCount(count: number): Promise<void> {
    if (count === 0) {
      await expect(this.cartBadge).toBeHidden();
      return;
    }
    await expect(this.cartBadge).toHaveText(String(count));
  }

  async continueShopping(): Promise<void> {
    await this.continueShoppingButton.click();
  }

  async checkout(): Promise<void> {
    await this.checkoutButton.click();
  }
  async expectItem(name: string, price?: string) { const item = this.itemByName(name); await expect(item).toBeVisible(); if (price) await expect(item.locator('[data-test="inventory-item-price"]')).toHaveText(price); }
  async expectItemRemoved(name: string) { await expect(this.itemByName(name)).toHaveCount(0); }
  async expectAllItemQuantitiesAreOne() { const quantities=this.cartItems.locator('[data-test="item-quantity"]'); expect(await quantities.count()).toBeGreaterThan(0); for (const quantity of await quantities.all()) await expect(quantity).toHaveText('1'); }

}

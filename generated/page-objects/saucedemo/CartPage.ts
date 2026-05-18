import { expect, Locator, Page } from '@playwright/test';

export class CartPage {
  readonly page: Page;
  readonly title: Locator;
  readonly cartList: Locator;
  readonly cartItems: Locator;
  readonly checkoutButton: Locator;
  readonly continueShoppingButton: Locator;
  readonly cartBadge: Locator;

  constructor(page: Page) {
    this.page = page;
    this.title = page.locator('[data-test=title]');
    this.cartList = page.locator('[data-test=cart-list]');
    this.cartItems = page.locator('[data-test=inventory-item]');
    this.checkoutButton = page.locator('[data-test=checkout]');
    this.continueShoppingButton = page.locator('[data-test=continue-shopping]');
    this.cartBadge = page.locator('[data-test=shopping-cart-badge]');
  }

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/cart\.html/);
    await expect(this.title).toHaveText('Your Cart');
    await expect(this.cartList).toBeVisible();
  }

  cartItem(productName: string): Locator {
    return this.cartItems.filter({ has: this.page.locator('[data-test=inventory-item-name]', { hasText: productName }) });
  }

  async expectItem(productName: string): Promise<void> {
    const item = this.cartItem(productName);
    await expect(item).toBeVisible();
    await expect(item.locator('[data-test=inventory-item-name]')).toHaveText(productName);
    await expect(item.locator('[data-test=inventory-item-desc]')).toBeVisible();
    await expect(item.locator('[data-test=inventory-item-price]')).toBeVisible();
    await expect(item.locator('[data-test=item-quantity]')).toHaveText('1');
  }

  async removeProduct(productName: string): Promise<void> {
    await this.cartItem(productName).getByRole('button', { name: 'Remove' }).click();
  }

  async expectItemRemoved(productName: string): Promise<void> {
    await expect(this.cartItem(productName)).toHaveCount(0);
  }

  async checkout(): Promise<void> {
    await this.checkoutButton.click();
  }

  async continueShopping(): Promise<void> {
    await this.continueShoppingButton.click();
  }

  async expectAllItemQuantitiesAreOne(): Promise<void> {
    const quantities = this.cartItems.locator('[data-test=item-quantity]');
    const count = await quantities.count();
    for (let index = 0; index < count; index++) {
      await expect(quantities.nth(index)).toHaveText('1');
    }
  }

  async expectCartBadgeHidden(): Promise<void> {
    await expect(this.cartBadge).toHaveCount(0);
  }
}
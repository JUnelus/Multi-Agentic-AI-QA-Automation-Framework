import { expect, Locator, Page } from '@playwright/test';

export class CheckoutOverviewPage {
  readonly page: Page;
  readonly title: Locator;
  readonly overviewItems: Locator;
  readonly subtotalLabel: Locator;
  readonly taxLabel: Locator;
  readonly totalLabel: Locator;
  readonly finishButton: Locator;
  readonly cancelButton: Locator;
  readonly cartBadge: Locator;

  constructor(page: Page) {
    this.page = page;
    this.title = page.locator('[data-test="title"]');
    this.overviewItems = page.locator('[data-test="inventory-item"]');
    this.subtotalLabel = page.locator('[data-test="subtotal-label"]');
    this.taxLabel = page.locator('[data-test="tax-label"]');
    this.totalLabel = page.locator('[data-test="total-label"]');
    this.finishButton = page.locator('[data-test="finish"]');
    this.cancelButton = page.locator('[data-test="cancel"]');
    this.cartBadge = page.locator('[data-test="shopping-cart-badge"]');
  }

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/checkout-step-two.html/);
    await expect(this.title).toHaveText('Checkout: Overview');
    await expect(this.finishButton).toBeVisible();
    await expect(this.cancelButton).toBeVisible();
  }

  async getItemPrices(): Promise<number[]> {
    const prices = await this.page.locator('[data-test="inventory-item-price"]').allTextContents();
    return prices.map((price) => Number(price.replace('$', '').trim()));
  }

  private async getMoneyValue(locator: Locator): Promise<number> {
    const text = await locator.innerText();
    return Number(text.replace(/[^0-9.]/g, ''));
  }

  async expectTotalsAreCorrect(): Promise<void> {
    const prices = await this.getItemPrices();
    expect(prices.length).toBeGreaterThan(0);
    const expectedSubtotal = prices.reduce((sum, price) => sum + price, 0);
    const subtotal = await this.getMoneyValue(this.subtotalLabel);
    const tax = await this.getMoneyValue(this.taxLabel);
    const total = await this.getMoneyValue(this.totalLabel);
    expect(subtotal).toBeCloseTo(expectedSubtotal, 2);
    expect(total).toBeCloseTo(subtotal + tax, 2);
  }

  async finish(): Promise<void> {
    await this.finishButton.click();
  }

  async cancel(): Promise<void> {
    await this.cancelButton.click();
  }

  async expectCartBadgeCount(count: number): Promise<void> {
    if (count === 0) {
      await expect(this.cartBadge).toBeHidden();
      return;
    }
    await expect(this.cartBadge).toHaveText(String(count));
  }
}

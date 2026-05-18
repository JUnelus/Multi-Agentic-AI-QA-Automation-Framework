import { expect, Locator, Page } from '@playwright/test';

export class CheckoutOverviewPage {
  readonly page: Page;
  readonly title: Locator;
  readonly cartItems: Locator;
  readonly itemTotal: Locator;
  readonly tax: Locator;
  readonly total: Locator;
  readonly finishButton: Locator;
  readonly cancelButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.title = page.locator('[data-test=title]');
    this.cartItems = page.locator('[data-test=inventory-item]');
    this.itemTotal = page.locator('[data-test=subtotal-label]');
    this.tax = page.locator('[data-test=tax-label]');
    this.total = page.locator('[data-test=total-label]');
    this.finishButton = page.locator('[data-test=finish]');
    this.cancelButton = page.locator('[data-test=cancel]');
  }

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/checkout-step-two\.html/);
    await expect(this.title).toHaveText('Checkout: Overview');
  }

  item(productName: string): Locator {
    return this.cartItems.filter({ has: this.page.locator('[data-test=inventory-item-name]', { hasText: productName }) });
  }

  async expectItem(productName: string): Promise<void> {
    const item = this.item(productName);
    await expect(item).toBeVisible();
    await expect(item.locator('[data-test=inventory-item-name]')).toHaveText(productName);
    await expect(item.locator('[data-test=inventory-item-desc]')).toBeVisible();
    await expect(item.locator('[data-test=inventory-item-price]')).toBeVisible();
    await expect(item.locator('[data-test=item-quantity]')).toHaveText('1');
  }

  async getItemPrices(): Promise<number[]> {
    const prices = await this.cartItems.locator('[data-test=inventory-item-price]').allTextContents();
    return prices.map(price => Number(price.replace('$', '')));
  }

  private async getAmount(locator: Locator): Promise<number> {
    const text = await locator.innerText();
    const amount = text.match(/[0-9]+\.[0-9]{2}/)?.[0];
    return Number(amount);
  }

  async expectTotalsCalculatedCorrectly(): Promise<void> {
    const prices = await this.getItemPrices();
    const expectedItemTotal = Number(prices.reduce((sum, price) => sum + price, 0).toFixed(2));
    const actualItemTotal = await this.getAmount(this.itemTotal);
    const actualTax = await this.getAmount(this.tax);
    const actualTotal = await this.getAmount(this.total);
    expect(actualItemTotal).toBe(expectedItemTotal);
    expect(actualTotal).toBe(Number((actualItemTotal + actualTax).toFixed(2)));
  }

  async finish(): Promise<void> {
    await this.finishButton.click();
  }

  async cancel(): Promise<void> {
    await this.cancelButton.click();
  }
}
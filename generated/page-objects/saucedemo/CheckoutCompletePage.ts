import { expect, Locator, Page } from '@playwright/test';

export class CheckoutCompletePage {
  readonly page: Page;
  readonly title: Locator;
  readonly completeHeader: Locator;
  readonly backHomeButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.title = page.locator('[data-test="title"]');
    this.completeHeader = page.locator('[data-test="complete-header"]');
    this.backHomeButton = page.locator('[data-test="back-to-products"]');
  }

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/checkout-complete.html/);
    await expect(this.title).toHaveText('Checkout: Complete!');
    await expect(this.completeHeader).toHaveText('Thank you for your order!');
    await expect(this.backHomeButton).toBeVisible();
  }

  async backHome(): Promise<void> {
    await this.backHomeButton.click();
  }
}

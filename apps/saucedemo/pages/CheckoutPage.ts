import { expect, Page } from '@playwright/test';

export class CheckoutPage {
  constructor(private readonly page: Page) {}

  async enterCustomerInfo(firstName: string, lastName: string, postalCode: string) {
    await this.page.locator('[data-test="firstName"]').fill(firstName);
    await this.page.locator('[data-test="lastName"]').fill(lastName);
    await this.page.locator('[data-test="postalCode"]').fill(postalCode);
    await this.page.locator('[data-test="continue"]').click();
  }

  async finishOrder() {
    await this.page.locator('[data-test="finish"]').click();
  }

  async verifyOrderConfirmation() {
    await expect(this.page.locator('[data-test="complete-header"]')).toContainText(
      'Thank you for your order!'
    );
  }

  async verifyCheckoutError(message: string) {
    await expect(this.page.locator('[data-test="error"]')).toContainText(message);
  }
}


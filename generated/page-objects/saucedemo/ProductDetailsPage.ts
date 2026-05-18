import { expect, Locator, Page } from '@playwright/test';

export class ProductDetailsPage {
  readonly page: Page;
  readonly name: Locator;
  readonly image: Locator;
  readonly description: Locator;
  readonly price: Locator;
  readonly actionButton: Locator;
  readonly backToProductsButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.name = page.locator('[data-test=inventory-item-name]');
    this.image = page.locator('[data-test=item-sauce-labs-backpack-img], .inventory_details_img');
    this.description = page.locator('[data-test=inventory-item-desc]');
    this.price = page.locator('[data-test=inventory-item-price]');
    this.actionButton = page.getByRole('button', { name: /Add to cart|Remove/ });
    this.backToProductsButton = page.locator('[data-test=back-to-products]');
  }

  async expectLoadedFor(productName: string): Promise<void> {
    await expect(this.page).toHaveURL(/inventory-item\.html/);
    await expect(this.name).toHaveText(productName);
    await expect(this.image).toBeVisible();
    await expect(this.description).toBeVisible();
    await expect(this.price).toBeVisible();
    await expect(this.actionButton).toBeVisible();
  }

  async backToProducts(): Promise<void> {
    await this.backToProductsButton.click();
  }
}
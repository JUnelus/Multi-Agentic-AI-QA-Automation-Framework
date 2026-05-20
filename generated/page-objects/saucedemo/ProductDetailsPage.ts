import { expect, Locator, Page } from '@playwright/test';

export class ProductDetailsPage {
  readonly page: Page;
  readonly name: Locator;
  readonly description: Locator;
  readonly price: Locator;
  readonly image: Locator;
  readonly addToCartButton: Locator;
  readonly backToProductsButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.name = page.locator('[data-test="inventory-item-name"]');
    this.description = page.locator('[data-test="inventory-item-desc"]');
    this.price = page.locator('[data-test="inventory-item-price"]');
    this.image = page.locator('.inventory_details_img');
    this.addToCartButton = page.getByRole('button', { name: 'Add to cart' });
    this.backToProductsButton = page.locator('[data-test="back-to-products"]');
  }

  async expectLoadedForProduct(productName: string): Promise<void> {
    await expect(this.page).toHaveURL(/inventory-item.html/);
    await expect(this.name).toHaveText(productName);
    await expect(this.description).toBeVisible();
    await expect(this.price).toContainText('$');
    await expect(this.image).toBeVisible();
    await expect(this.image).toHaveAttribute('alt', /.+/);
    await expect(this.addToCartButton).toBeVisible();
    await expect(this.backToProductsButton).toBeVisible();
  }

  async backToProducts(): Promise<void> {
    await this.backToProductsButton.click();
  }
}

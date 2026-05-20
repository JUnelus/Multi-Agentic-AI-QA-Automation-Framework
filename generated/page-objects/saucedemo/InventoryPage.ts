import { expect, Locator, Page } from '@playwright/test';

export type ProductDetails = {
  name: string;
  description: string;
  price: number;
};

export class InventoryPage {
  readonly page: Page;
  readonly title: Locator;
  readonly inventoryItems: Locator;
  readonly sortDropdown: Locator;
  readonly cartLink: Locator;
  readonly cartBadge: Locator;
  readonly menuButton: Locator;
  readonly menuCloseButton: Locator;
  readonly logoutLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.title = page.locator('[data-test="title"]');
    this.inventoryItems = page.locator('[data-test="inventory-item"]');
    this.sortDropdown = page.locator('[data-test="product-sort-container"]');
    this.cartLink = page.locator('[data-test="shopping-cart-link"]');
    this.cartBadge = page.locator('[data-test="shopping-cart-badge"]');
    this.menuButton = page.locator('#react-burger-menu-btn');
    this.menuCloseButton = page.locator('#react-burger-cross-btn');
    this.logoutLink = page.locator('[data-test="logout-sidebar-link"]');
  }

  productByName(name: string): Locator {
    return this.inventoryItems.filter({ hasText: name });
  }

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/inventory.html/);
    await expect(this.title).toHaveText('Products');
    await expect(this.inventoryItems).toHaveCount(6);
    await expect(this.cartLink).toBeVisible();
    await expect(this.menuButton).toBeVisible();
    await expect(this.sortDropdown).toBeVisible();
  }

  async getProductNames(): Promise<string[]> {
    return (await this.page.locator('[data-test="inventory-item-name"]').allTextContents()).map((name) => name.trim());
  }

  async getProductPrices(): Promise<number[]> {
    const prices = await this.page.locator('[data-test="inventory-item-price"]').allTextContents();
    return prices.map((price) => Number(price.replace('$', '').trim()));
  }

  async getProductDetails(name: string): Promise<ProductDetails> {
    const item = this.productByName(name);
    return {
      name: (await item.locator('[data-test="inventory-item-name"]').innerText()).trim(),
      description: (await item.locator('[data-test="inventory-item-desc"]').innerText()).trim(),
      price: Number((await item.locator('[data-test="inventory-item-price"]').innerText()).replace('$', '').trim())
    };
  }

  async selectSort(option: 'az' | 'za' | 'lohi' | 'hilo'): Promise<void> {
    await this.sortDropdown.selectOption(option);
  }

  async addProduct(name: string): Promise<void> {
    await this.productByName(name).getByRole('button', { name: 'Add to cart' }).click();
  }

  async addProducts(names: string[]): Promise<void> {
    for (const name of names) {
      await this.addProduct(name);
    }
  }

  async removeProduct(name: string): Promise<void> {
    await this.productByName(name).getByRole('button', { name: 'Remove' }).click();
  }

  async expectProductButton(name: string, buttonName: 'Add to cart' | 'Remove'): Promise<void> {
    await expect(this.productByName(name).getByRole('button', { name: buttonName })).toBeVisible();
  }

  async expectCartBadgeCount(count: number): Promise<void> {
    if (count === 0) {
      await expect(this.cartBadge).toBeHidden();
      return;
    }
    await expect(this.cartBadge).toHaveText(String(count));
  }

  async openCart(): Promise<void> {
    await this.cartLink.click();
  }

  async openProductDetails(name: string): Promise<void> {
    await this.productByName(name).locator('[data-test="inventory-item-name"]').click();
  }

  async openMenu(): Promise<void> {
    await this.menuButton.click();
    await expect(this.logoutLink).toBeVisible();
  }

  async closeMenu(): Promise<void> {
    await this.menuCloseButton.click();
    await expect(this.logoutLink).toBeHidden();
  }

  async logout(): Promise<void> {
    await this.openMenu();
    await this.logoutLink.click();
  }

  async expectAllExpectedProductsDisplayed(expectedNames: string[]): Promise<void> {
    await expect(this.inventoryItems).toHaveCount(expectedNames.length);
    for (const name of expectedNames) {
      const item = this.productByName(name);
      await expect(item.locator('[data-test="inventory-item-name"]')).toHaveText(name);
      await expect(item.locator('[data-test="inventory-item-desc"]')).toBeVisible();
      await expect(item.locator('[data-test="inventory-item-price"]')).toContainText('$');
      await expect(item.getByRole('button', { name: 'Add to cart' })).toBeVisible();
      await expect(item.locator('img')).toHaveAttribute('alt', /.+/);
    }
  }

  async expectAllProductImagesHaveAccessibleAlternatives(): Promise<void> {
    const images = this.inventoryItems.locator('img');
    const count = await images.count();
    expect(count).toBeGreaterThan(0);
    for (let index = 0; index < count; index++) {
      await expect(images.nth(index)).toHaveAttribute('alt', /.+/);
    }
  }
}

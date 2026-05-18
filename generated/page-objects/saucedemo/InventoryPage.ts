import { expect, Locator, Page } from '@playwright/test';

export type ProductSortOption = 'az' | 'za' | 'lohi' | 'hilo';

export class InventoryPage {
  readonly page: Page;
  readonly title: Locator;
  readonly inventoryList: Locator;
  readonly inventoryItems: Locator;
  readonly cartLink: Locator;
  readonly cartBadge: Locator;
  readonly sortDropdown: Locator;
  readonly menuButton: Locator;
  readonly closeMenuButton: Locator;
  readonly logoutLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.title = page.locator('[data-test=title]');
    this.inventoryList = page.locator('[data-test=inventory-list]');
    this.inventoryItems = page.locator('[data-test=inventory-item]');
    this.cartLink = page.locator('[data-test=shopping-cart-link]');
    this.cartBadge = page.locator('[data-test=shopping-cart-badge]');
    this.sortDropdown = page.locator('[data-test=product-sort-container]');
    this.menuButton = page.locator('[data-test=open-menu]');
    this.closeMenuButton = page.locator('[data-test=close-menu]');
    this.logoutLink = page.locator('[data-test=logout-sidebar-link]');
  }

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/inventory\.html/);
    await expect(this.title).toHaveText('Products');
    await expect(this.inventoryList).toBeVisible();
    await expect(this.inventoryItems).toHaveCount(6);
  }

  productItem(productName: string): Locator {
    return this.inventoryItems.filter({ has: this.page.locator('[data-test=inventory-item-name]', { hasText: productName }) });
  }

  async expectProductListDetails(): Promise<void> {
    await this.expectLoaded();
    const count = await this.inventoryItems.count();
    for (let index = 0; index < count; index++) {
      const item = this.inventoryItems.nth(index);
      await expect(item.locator('[data-test=inventory-item-name]')).toBeVisible();
      await expect(item.locator('[data-test=inventory-item-img]')).toBeVisible();
      await expect(item.locator('[data-test=inventory-item-desc]')).toBeVisible();
      await expect(item.locator('[data-test=inventory-item-price]')).toBeVisible();
      await expect(item.getByRole('button', { name: /Add to cart|Remove/ })).toBeVisible();
    }
  }

  async addProduct(productName: string): Promise<void> {
    await this.productItem(productName).getByRole('button', { name: 'Add to cart' }).click();
  }

  async removeProduct(productName: string): Promise<void> {
    await this.productItem(productName).getByRole('button', { name: 'Remove' }).click();
  }

  async expectProductButton(productName: string, buttonName: 'Add to cart' | 'Remove'): Promise<void> {
    await expect(this.productItem(productName).getByRole('button', { name: buttonName })).toBeVisible();
  }

  async expectCartBadge(quantity: number): Promise<void> {
    await expect(this.cartBadge).toHaveText(String(quantity));
  }

  async expectCartBadgeHidden(): Promise<void> {
    await expect(this.cartBadge).toHaveCount(0);
  }

  async openCart(): Promise<void> {
    await this.cartLink.click();
  }

  async openProduct(productName: string): Promise<void> {
    await this.productItem(productName).locator('[data-test=inventory-item-name]').click();
  }

  async sortBy(option: ProductSortOption): Promise<void> {
    await this.sortDropdown.selectOption(option);
  }

  async getProductNames(): Promise<string[]> {
    return this.inventoryItems.locator('[data-test=inventory-item-name]').allTextContents();
  }

  async getProductPrices(): Promise<number[]> {
    const prices = await this.inventoryItems.locator('[data-test=inventory-item-price]').allTextContents();
    return prices.map(price => Number(price.replace('$', '')));
  }

  async openMenu(): Promise<void> {
    await this.menuButton.click();
    await expect(this.logoutLink).toBeVisible();
  }

  async closeMenu(): Promise<void> {
    await this.closeMenuButton.click();
    await expect(this.logoutLink).toBeHidden();
  }

  async logout(): Promise<void> {
    await this.openMenu();
    await this.logoutLink.click();
  }

  async expectProductImagesHaveAltText(): Promise<void> {
    const images = this.inventoryItems.locator('img');
    const count = await images.count();
    for (let index = 0; index < count; index++) {
      await expect(images.nth(index)).toHaveAttribute('alt', /\S+/);
    }
  }
}
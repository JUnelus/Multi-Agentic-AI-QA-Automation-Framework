import { expect, Page } from '@playwright/test';
export class LoginPage {
  constructor(private readonly page: Page) {}
  async login() {
    await this.page.goto('/');
    await this.page.locator('[data-test="username"]').fill('standard_user');
    await this.page.locator('[data-test="password"]').fill('secret_sauce');
    await this.page.locator('[data-test="login-button"]').click();
  }
  async expectInventory() {
    await expect(this.page).toHaveURL(/\/inventory\.html$/);
    await expect(
      this.page.locator('[data-test="inventory-container"]')
    ).toBeVisible();
    await expect(this.page.locator('[data-test="title"]')).toHaveText(
      'Products'
    );
  }
}

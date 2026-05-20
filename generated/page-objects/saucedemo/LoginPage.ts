import { expect, Locator, Page } from '@playwright/test';

export class LoginPage {
  static readonly url = 'https://www.saucedemo.com/';

  readonly page: Page;
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly errorMessage: Locator;
  readonly errorCloseButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.usernameInput = page.locator('[data-test="username"]');
    this.passwordInput = page.locator('[data-test="password"]');
    this.loginButton = page.locator('[data-test="login-button"]');
    this.errorMessage = page.locator('[data-test="error"]');
    this.errorCloseButton = page.locator('button.error-button');
  }

  async goto(): Promise<void> {
    await this.page.goto(LoginPage.url);
  }

  async gotoPath(path: string): Promise<void> {
    await this.page.goto(new URL(path, LoginPage.url).toString());
  }

  async login(username: string, password: string): Promise<void> {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  async submit(): Promise<void> {
    await this.loginButton.click();
  }

  async expectLoginPageVisible(): Promise<void> {
    await expect(this.usernameInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.loginButton).toBeVisible();
  }

  async expectErrorMessage(message: string | RegExp): Promise<void> {
    await expect(this.errorMessage).toBeVisible();
    await expect(this.errorMessage).toContainText(message);
  }

  async dismissError(): Promise<void> {
    await this.errorCloseButton.click();
    await expect(this.errorMessage).toBeHidden();
  }

  async expectFormFieldsHaveAccessibleNames(): Promise<void> {
    await expect(this.usernameInput).toHaveAttribute('placeholder', /Username/i);
    await expect(this.passwordInput).toHaveAttribute('placeholder', /Password/i);
    await expect(this.loginButton).toHaveValue(/Login/i);
  }
}

import { expect, Locator, Page } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly errorMessage: Locator;
  readonly errorCloseButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.usernameInput = page.locator('[data-test=username]');
    this.passwordInput = page.locator('[data-test=password]');
    this.loginButton = page.locator('[data-test=login-button]');
    this.errorMessage = page.locator('[data-test=error]');
    this.errorCloseButton = page.locator('[data-test=error-button]');
  }

  async goto(): Promise<void> {
    await this.page.goto('https://www.saucedemo.com/');
  }

  async gotoPath(path: string): Promise<void> {
    await this.page.goto(`https://www.saucedemo.com/${path}`);
  }

  async login(username: string, password: string): Promise<void> {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  async submit(): Promise<void> {
    await this.loginButton.click();
  }

  async expectOnLoginPage(): Promise<void> {
    await expect(this.page).toHaveURL('https://www.saucedemo.com/');
    await expect(this.usernameInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.loginButton).toBeVisible();
  }

  async expectError(message: string): Promise<void> {
    await expect(this.errorMessage).toBeVisible();
    await expect(this.errorMessage).toHaveText(message);
  }

  async expectErrorContaining(message: string): Promise<void> {
    await expect(this.errorMessage).toBeVisible();
    await expect(this.errorMessage).toContainText(message);
  }

  async dismissError(): Promise<void> {
    await this.errorCloseButton.click();
  }

  async expectErrorDismissed(): Promise<void> {
    await expect(this.errorMessage).toBeHidden();
  }

  async expectLoginErrorStyling(): Promise<void> {
    await expect(this.errorMessage).toBeVisible();
    await expect(this.usernameInput).toHaveClass(/error/);
    await expect(this.passwordInput).toHaveClass(/error/);
  }

  async expectFormFieldsHaveAccessibleNames(): Promise<void> {
    await expect(this.page.getByPlaceholder('Username')).toBeVisible();
    await expect(this.page.getByPlaceholder('Password')).toBeVisible();
  }
}
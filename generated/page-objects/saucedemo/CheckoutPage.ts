import { expect, Locator, Page } from '@playwright/test';

export class CheckoutPage {
  readonly page: Page;
  readonly title: Locator;
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly postalCodeInput: Locator;
  readonly continueButton: Locator;
  readonly cancelButton: Locator;
  readonly errorMessage: Locator;
  readonly errorCloseButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.title = page.locator('[data-test=title]');
    this.firstNameInput = page.locator('[data-test=firstName]');
    this.lastNameInput = page.locator('[data-test=lastName]');
    this.postalCodeInput = page.locator('[data-test=postalCode]');
    this.continueButton = page.locator('[data-test=continue]');
    this.cancelButton = page.locator('[data-test=cancel]');
    this.errorMessage = page.locator('[data-test=error]');
    this.errorCloseButton = page.locator('[data-test=error-button]');
  }

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/checkout-step-one\.html/);
    await expect(this.title).toHaveText('Checkout: Your Information');
    await expect(this.firstNameInput).toBeVisible();
    await expect(this.lastNameInput).toBeVisible();
    await expect(this.postalCodeInput).toBeVisible();
  }

  async fillInformation(firstName: string, lastName: string, postalCode: string): Promise<void> {
    await this.firstNameInput.fill(firstName);
    await this.lastNameInput.fill(lastName);
    await this.postalCodeInput.fill(postalCode);
  }

  async continue(): Promise<void> {
    await this.continueButton.click();
  }

  async cancel(): Promise<void> {
    await this.cancelButton.click();
  }

  async expectError(message: string): Promise<void> {
    await expect(this.errorMessage).toBeVisible();
    await expect(this.errorMessage).toHaveText(message);
  }

  async dismissError(): Promise<void> {
    await this.errorCloseButton.click();
  }

  async expectErrorDismissed(): Promise<void> {
    await expect(this.errorMessage).toBeHidden();
  }

  async expectFormFieldsHaveAccessibleNames(): Promise<void> {
    await expect(this.page.getByPlaceholder('First Name')).toBeVisible();
    await expect(this.page.getByPlaceholder('Last Name')).toBeVisible();
    await expect(this.page.getByPlaceholder('Zip/Postal Code')).toBeVisible();
  }
}
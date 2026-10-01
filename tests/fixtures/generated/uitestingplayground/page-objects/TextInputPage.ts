import { expect, Page } from '@playwright/test';
export class TextInputPage {
  constructor(private readonly page: Page) {}
  async renameButton(name: string) {
    await this.page.goto('/textinput');
    await this.page.locator('#newButtonName').fill(name);
    await this.page.locator('#updatingButton').click();
  }
  async expectButtonName(name: string) {
    await expect(this.page.locator('#updatingButton')).toHaveText(name);
  }
}


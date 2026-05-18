import { expect, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

export class AccessibilityPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async expectNoCriticalOrSeriousViolations(): Promise<void> {
    const results = await new AxeBuilder({ page: this.page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    const blockingViolations = results.violations.filter(violation => ['critical', 'serious'].includes(violation.impact ?? ''));
    expect(blockingViolations, JSON.stringify(blockingViolations, null, 2)).toEqual([]);
  }

  async expectHeadingStructureHasPageHeading(expectedHeading: string): Promise<void> {
    await expect(this.page.getByText(expectedHeading, { exact: true }).first()).toBeVisible();
  }
}
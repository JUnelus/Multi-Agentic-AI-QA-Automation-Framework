import { expect, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

export class AccessibilityScan {
  static async expectNoCriticalViolations(page: Page): Promise<void> {
    const results = await new AxeBuilder({ page }).analyze();
    const criticalViolations = results.violations.filter((violation) => violation.impact === 'critical');
    expect(criticalViolations, criticalViolations.map((violation) => `${violation.id}: ${violation.help}`).join('\n')).toEqual([]);
  }

  static async expectNoWcagAAViolations(page: Page): Promise<void> {
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    const blockingViolations = results.violations.filter((violation) => violation.impact === 'critical' || violation.impact === 'serious');
    expect(blockingViolations, blockingViolations.map((violation) => `${violation.id}: ${violation.help}`).join('\n')).toEqual([]);
  }
}

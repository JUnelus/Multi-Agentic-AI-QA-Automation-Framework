import fs from 'node:fs';
import type {
  Reporter,
  TestCase,
  TestResult,
  TestStep
} from '@playwright/test/reporter';
export default class AssertionReporter implements Reporter {
  private counts = new Map<string, number>();
  private results: { title: string; count: number }[] = [];
  onStepEnd(test: TestCase, _result: TestResult, step: TestStep): void {
    if (step.category !== 'expect' || step.error) return;
    for (let parent = step.parent; parent; parent = parent.parent)
      if (parent.category === 'hook' || parent.category === 'fixture') return;
    this.counts.set(test.id, (this.counts.get(test.id) || 0) + 1);
  }
  onTestEnd(test: TestCase): void {
    this.results.push({
      title: test.title,
      count: this.counts.get(test.id) || 0
    });
  }
  onEnd(): void {
    if (process.env.QA_ASSERTIONS_FILE)
      fs.writeFileSync(
        process.env.QA_ASSERTIONS_FILE,
        JSON.stringify(this.results)
      );
  }
}

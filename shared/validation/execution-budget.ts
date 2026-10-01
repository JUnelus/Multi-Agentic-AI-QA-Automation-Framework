export const GENERATED_TEST_TIMEOUT_MS = 30000;
// Playwright gives each beforeAll/afterAll hook its own timeout equal to the test
// timeout; beforeEach/afterEach run inside the owning test's budget.
export function executionBudget(
  caseCount: number,
  perTestMs = GENERATED_TEST_TIMEOUT_MS,
  suiteHookCount = 0
) {
  if (!Number.isSafeInteger(caseCount) || caseCount < 1 || caseCount > 200)
    throw new Error('Approved suite must contain 1..200 test cases');
  if (
    !Number.isSafeInteger(perTestMs) ||
    perTestMs < 1000 ||
    perTestMs > 120000
  )
    throw new Error('Per-test budget must be 1000..120000 ms');
  if (
    !Number.isSafeInteger(suiteHookCount) ||
    suiteHookCount < 0 ||
    suiteHookCount > 200
  )
    throw new Error('Suite hook count must be 0..200');
  const startupMs = 30000;
  const maximumMs = 15 * 60 * 1000;
  const requiredMs = startupMs + (caseCount + suiteHookCount) * perTestMs;
  // Reject oversized batches explicitly instead of terminating a valid suite at an undersized cap.
  if (requiredMs > maximumMs)
    throw new Error(
      'Suite exceeds 15-minute execution budget; split the approved cases into smaller batches'
    );
  return {
    caseCount,
    suiteHookCount,
    perTestMs,
    globalTimeoutMs: Math.max(60000, requiredMs),
    processTimeoutMs: Math.max(60000, requiredMs) + 30000
  };
}

export const GENERATED_TEST_TIMEOUT_MS = 30000;
// Playwright runs each test body in one timeout slot and then runs afterEach
// hooks plus test-scoped fixture teardown (including the origin guard's context
// close) in a separate "After Hooks" slot with the same timeout. Both slots are
// reserved per case. beforeAll/afterAll hooks, which would receive further
// separate slots, are rejected by the static audit.
export function executionBudget(
  caseCount: number,
  perTestMs = GENERATED_TEST_TIMEOUT_MS
) {
  if (!Number.isSafeInteger(caseCount) || caseCount < 1 || caseCount > 200)
    throw new Error('Approved suite must contain 1..200 test cases');
  if (
    !Number.isSafeInteger(perTestMs) ||
    perTestMs < 1000 ||
    perTestMs > 120000
  )
    throw new Error('Per-test budget must be 1000..120000 ms');
  const startupMs = 30000;
  const afterHooksMs = perTestMs;
  const maximumMs = 15 * 60 * 1000;
  const requiredMs = startupMs + caseCount * (perTestMs + afterHooksMs);
  // Reject oversized batches explicitly instead of terminating a valid suite at an undersized cap.
  if (requiredMs > maximumMs)
    throw new Error(
      'Suite exceeds 15-minute execution budget; split the approved cases into smaller batches'
    );
  return {
    caseCount,
    perTestMs,
    afterHooksMs,
    globalTimeoutMs: Math.max(60000, requiredMs),
    processTimeoutMs: Math.max(60000, requiredMs) + 30000
  };
}

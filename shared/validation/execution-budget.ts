export const GENERATED_TEST_TIMEOUT_MS = 30000;
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
  const maximumMs = 15 * 60 * 1000;
  const requiredMs = startupMs + caseCount * perTestMs;
  // Reject oversized batches explicitly instead of terminating a valid suite at an undersized cap.
  if (requiredMs > maximumMs)
    throw new Error(
      'Suite exceeds 15-minute execution budget; split the approved cases into smaller batches'
    );
  return {
    caseCount,
    perTestMs,
    globalTimeoutMs: Math.max(60000, requiredMs),
    processTimeoutMs: Math.max(60000, requiredMs) + 30000
  };
}

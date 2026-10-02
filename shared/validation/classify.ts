import { FailureCategory } from '../schemas/validation-report.schema';
export function classifyFailure(
  stage: 'schema' | 'typecheck' | 'discovery' | 'execution',
  diagnostic: string
): FailureCategory {
  if (
    /browser.*(not found|doesn't exist)|ECONNREFUSED|ERR_NAME_NOT_RESOLVED|ERR_CONNECTION|ENOTFOUND|ENOENT|EACCES|EPERM|ENOSPC|EROFS|global timeout/i.test(
      diagnostic
    )
  )
    return 'ENVIRONMENT_ERROR';
  if (/Generated tests cannot use test\./.test(diagnostic))
    return 'GENERATOR_ERROR';
  if (stage === 'schema') return 'GENERATOR_ERROR';
  if (stage === 'execution') {
    if (
      /Generated origin isolation|Generated execution blocks|No executable assertion|Missing executed assertion|Every test must execute at least one successful assertion/i.test(
        diagnostic
      )
    )
      return 'GENERATOR_ERROR';
    // An assertion mismatch against approved behavior is never a repair invitation.
    if (/expect\(|toHave|toBe|assertion|expected:|received:/i.test(diagnostic))
      return 'POSSIBLE_PRODUCT_DEFECT';
    if (
      /locator\.(click|fill)|strict mode violation|waiting for locator/i.test(
        diagnostic
      )
    )
      return 'SELECTOR_ERROR';
    return 'UNKNOWN';
  }
  if (/TS2307|Cannot find module|Cannot find package/.test(diagnostic))
    return 'IMPORT_ERROR';
  if (/TS2339|TS2551|does not exist on type/.test(diagnostic))
    return 'PAGE_OBJECT_CONTRACT_ERROR';
  if (/TS\d+/.test(diagnostic)) return 'GENERATOR_ERROR';
  return 'UNKNOWN';
}

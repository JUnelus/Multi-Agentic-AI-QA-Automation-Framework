import {
  validationReportSchema,
  ValidationReport
} from '../schemas/validation-report.schema';
export function requireTerminalReport(
  report: ValidationReport,
  stage: string
): ValidationReport {
  const parsed = validationReportSchema.parse(report);
  if (parsed.finalResult === 'pending')
    throw new Error(
      'Validation internal error: nonterminal pending report after ' + stage
    );
  return parsed;
}

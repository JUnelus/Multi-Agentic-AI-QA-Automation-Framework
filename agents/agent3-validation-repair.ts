import fs from 'node:fs';
import path from 'node:path';
import { readCode } from '../shared/validation/code-contract';
import { validateCode } from '../shared/validation/validator';
import { repairLoop } from '../shared/validation/repair';
export { repairLoop };
export async function validateAndRepair(app: string, directory: string, runDirectory: string, maxRepairs = 3) {
  const runId = path.basename(runDirectory);
  const result = await repairLoop({ code: readCode(directory), directory, runDirectory, maxRepairs, validate: (_code, dir, attempt) => validateCode(runId, app, dir, path.join(runDirectory, 'reports', 'attempt-' + attempt)) });
  fs.writeFileSync(path.join(runDirectory, 'validation-report.json'), JSON.stringify(result.report, null, 2));
  return result;
}
if (require.main === module) {
  const directory = process.argv[2];
  if (!directory) { console.error('Usage: agent:validate-repair <staging-directory>'); process.exitCode = 1; }
  else validateAndRepair(process.env.TARGET_APP || 'saucedemo', directory, path.dirname(directory)).then(result => { console.log(result.report.finalResult); if (result.report.finalResult !== 'passed') process.exitCode = 1; }).catch(() => { console.error('Validation failed'); process.exitCode = 1; });
}


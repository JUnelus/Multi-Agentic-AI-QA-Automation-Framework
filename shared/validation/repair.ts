import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { GeneratedCode } from '../schemas/generated-code.schema';
import { ValidationReport } from '../schemas/validation-report.schema';
import { stageCode } from '../utils/safe-path';
export const MAX_REPAIR_ATTEMPTS = 3;
// Mechanical import-only repair: code bodies, assertions and expected values are byte-for-byte preserved.
// Broader model-proposed repairs require a future semantic review gate.
export function repairImports(code: GeneratedCode): GeneratedCode | undefined {
  let changed = false;
  const repair = (file: GeneratedCode['specFiles'][number], spec: boolean) => {
    const source = ts.createSourceFile(
      file.fileName,
      file.code,
      ts.ScriptTarget.Latest,
      true
    );
    const edits: { start: number; end: number; text: string }[] = [];
    for (const statement of source.statements) {
      if (
        !ts.isImportDeclaration(statement) ||
        !ts.isStringLiteral(statement.moduleSpecifier)
      )
        continue;
      const name = statement.moduleSpecifier.text;
      if (!name.startsWith('.')) continue;
      const base = name
        .replaceAll('\\', '/')
        .split('/')
        .pop()!
        .replace(/\.ts$/, '');
      if (!code.pageObjects.some((p) => p.fileName === base + '.ts')) continue;
      const replacement = (spec ? '../page-objects/' : './') + base;
      if (name !== replacement)
        edits.push({
          start: statement.moduleSpecifier.getStart(source),
          end: statement.moduleSpecifier.end,
          text: JSON.stringify(replacement)
        });
    }
    let text = file.code;
    for (const edit of edits.reverse()) {
      text = text.slice(0, edit.start) + edit.text + text.slice(edit.end);
      changed = true;
    }
    return { ...file, code: text };
  };
  const result = {
    pageObjects: code.pageObjects.map((f) => repair(f, false)),
    specFiles: code.specFiles.map((f) => repair(f, true))
  };
  return changed ? result : undefined;
}
export async function repairLoop(options: {
  code: GeneratedCode;
  directory: string;
  runDirectory: string;
  maxRepairs?: number;
  validate: (
    code: GeneratedCode,
    directory: string,
    attempt: number
  ) => Promise<ValidationReport>;
}) {
  const max = options.maxRepairs ?? MAX_REPAIR_ATTEMPTS;
  if (!Number.isInteger(max) || max < 0 || max > MAX_REPAIR_ATTEMPTS)
    throw new Error('maxRepairs must be between 0 and 3');
  let code = options.code,
    directory = options.directory;
  let report = await options.validate(code, directory, 0);
  fs.mkdirSync(path.join(options.runDirectory, 'reports', 'attempt-0'), {
    recursive: true
  });
  fs.writeFileSync(
    path.join(
      options.runDirectory,
      'reports',
      'attempt-0',
      'validation-report.json'
    ),
    JSON.stringify(report, null, 2)
  );
  const initialTypecheck = report.typecheck;
  let attempts = 0;
  while (
    report.finalResult === 'failed' &&
    attempts < max &&
    ['IMPORT_ERROR', 'GENERATOR_ERROR'].includes(report.category || '')
  ) {
    const candidate = repairImports(code);
    if (!candidate) break;
    attempts++;
    directory = path.join(
      options.runDirectory,
      'repair',
      'attempt-' + attempts
    );
    stageCode(candidate, directory);
    fs.writeFileSync(
      path.join(directory, 'repair.json'),
      JSON.stringify(
        { policy: 'import-only', previousCategory: report.category },
        null,
        2
      )
    );
    code = candidate;
    report = await options.validate(code, directory, attempts);
    report.initialTypecheck = initialTypecheck;
    report.repairAttempts = attempts;
    fs.writeFileSync(
      path.join(directory, 'validation-report.json'),
      JSON.stringify(report, null, 2)
    );
  }
  report.initialTypecheck = initialTypecheck;
  report.repairAttempts = attempts;
  return { code, directory, report };
}

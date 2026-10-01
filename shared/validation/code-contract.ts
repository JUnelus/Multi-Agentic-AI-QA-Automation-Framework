import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { GeneratedCode, generatedCodeSchema } from '../schemas/generated-code.schema';
import { TestCase } from '../schemas/test-case.schema';
export function readCode(directory: string): GeneratedCode {
  const group = (name: string) => fs.readdirSync(path.join(directory, name)).map(fileName => ({ fileName, code: fs.readFileSync(path.join(directory, name, fileName), 'utf8') }));
  return generatedCodeSchema.parse({ pageObjects: group('page-objects'), specFiles: group('specs') });
}
export function auditCode(code: GeneratedCode, cases: TestCase[] = []): string[] {
  const errors: string[] = [];
  const dependencies = Object.keys(JSON.parse(fs.readFileSync('package.json', 'utf8')).dependencies);
  for (const file of [...code.pageObjects, ...code.specFiles]) {
    const source = ts.createSourceFile(file.fileName, file.code, ts.ScriptTarget.Latest, true);
    function visit(node: ts.Node) {
      if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
        const name = node.moduleSpecifier.text;
        const allowedRelative = /^(\.\/|\.\.\/page-objects\/)[A-Za-z][A-Za-z0-9_-]*$/.test(name);
        if (!(allowedRelative || (dependencies.includes(name) && ['@playwright/test', '@axe-core/playwright'].includes(name)))) errors.push('Unsupported dependency/import: ' + name);
      }
      if (ts.isIdentifier(node) && ['process', 'require', 'eval', 'Function', 'globalThis', 'global', 'fetch', 'XMLHttpRequest'].includes(node.text)) errors.push('Unsupported runtime capability: ' + node.text);
      if (ts.isCallExpression(node)) {
        const call = node.expression.getText(source);
        if (/\.(skip|fixme|only|fail|setTimeout|waitForTimeout)$/.test(call) || call === 'import' || call === 'setTimeout' || call === 'setInterval') errors.push('Unsupported test control: ' + call);
        if (/\.toHaveURL$/.test(call) && node.arguments.some(a => a.getText(source).includes('|'))) errors.push('Ambiguous URL assertion requires human review');
      }
      if (ts.isCatchClause(node)) errors.push('Generated code cannot swallow failures with catch');
      ts.forEachChild(node, visit);
    }
    visit(source);
    if (/@ts-(ignore|nocheck)|\bas any\b/.test(file.code)) errors.push('Type suppression is not allowed');
  }
  const specs = code.specFiles.map(f => f.code).join('\n');
  for (const c of cases) if (!specs.includes(c.testCaseId)) errors.push('Missing approved case: ' + c.testCaseId);
  if (![...code.pageObjects, ...code.specFiles].some(f => /\bexpect\s*\(/.test(f.code))) errors.push('Generated batch has no assertions');
  return [...new Set(errors)];
}
export function typecheckDirectory(directory: string): string[] {
  const config = ts.readConfigFile('tsconfig.json', ts.sys.readFile);
  if (config.error) return [ts.flattenDiagnosticMessageText(config.error.messageText, '\n')];
  const parsed = ts.parseJsonConfigFileContent({ ...config.config, include: [path.resolve(directory).replaceAll('\\', '/') + '/**/*.ts'], exclude: [] }, ts.sys, process.cwd());
  const program = ts.createProgram(parsed.fileNames, parsed.options);
  return ts.getPreEmitDiagnostics(program).map(d => (d.file ? d.file.fileName + ':' + (d.file.getLineAndCharacterOfPosition(d.start || 0).line + 1) + ': ' : '') + 'TS' + d.code + ': ' + ts.flattenDiagnosticMessageText(d.messageText, '\n'));
}


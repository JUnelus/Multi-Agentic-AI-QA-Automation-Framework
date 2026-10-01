import { assertionContract, guardedTestModule } from './assertion-contract';
import { assertAllowedUrl } from './origin-policy';
import { AppConfig } from '../schemas/app-config.schema';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import {
  GeneratedCode,
  generatedCodeSchema
} from '../schemas/generated-code.schema';
import { TestCase } from '../schemas/test-case.schema';
import { safeDestination } from '../utils/safe-path';
export function readCode(directory: string): GeneratedCode {
  const group = (name: 'page-objects' | 'specs') =>
    fs.readdirSync(path.join(directory, name)).map((fileName) => {
      const destination = safeDestination(
        path.join(directory, name),
        fileName,
        name === 'specs' ? 'spec' : 'page'
      );
      if (!fs.lstatSync(destination).isFile())
        throw new Error('Generated source must be a regular file');
      return { fileName, code: fs.readFileSync(destination, 'utf8') };
    });
  return generatedCodeSchema.parse({
    pageObjects: group('page-objects'),
    specFiles: group('specs')
  });
}
export function auditCode(
  code: GeneratedCode,
  cases: TestCase[] = [],
  config?: AppConfig
): string[] {
  const errors: string[] = [];
  const dependencies = Object.keys(
    JSON.parse(fs.readFileSync('package.json', 'utf8')).dependencies
  );
  for (const file of [...code.pageObjects, ...code.specFiles]) {
    const source = ts.createSourceFile(
      file.fileName,
      file.code,
      ts.ScriptTarget.Latest,
      true
    );
    const forbiddenMembers = new Set([
      'browser',
      'browserType',
      'constructor',
      'getPrototypeOf',
      'getOwnPropertyDescriptor',
      'getOwnPropertyDescriptors',
      'defineProperty',
      'defineProperties',
      'setPrototypeOf',
      'newContext',
      'newPage',
      'newCDPSession',
      'newBrowserCDPSession',
      'launch',
      'connect',
      'connectOverCDP',
      'route',
      'unroute',
      'unrouteAll',
      'routeWebSocket',
      'extend',
      'configure',
      'use',
      'slow',
      'setTimeout',
      // Suite hooks receive separate Playwright timeout slots outside the
      // per-case budget and cannot use worker-scoped browser capabilities.
      'beforeAll',
      'afterAll'
    ]);
    function visit(node: ts.Node) {
      if (
        ts.isPropertyAccessExpression(node) &&
        forbiddenMembers.has(node.name.text)
      )
        errors.push('Unsupported capability access: ' + node.name.text);
      if (
        ts.isBindingElement(node) &&
        node.propertyName &&
        forbiddenMembers.has(
          node.propertyName.getText(source).replace(/['"]/g, '')
        )
      )
        errors.push(
          'Unsupported destructured capability: ' +
            node.propertyName.getText(source).replace(/['"]/g, '')
        );
      if (ts.isElementAccessExpression(node)) {
        const key = node.argumentExpression;
        if (
          !ts.isNumericLiteral(key) &&
          !(ts.isStringLiteralLike(key) && !forbiddenMembers.has(key.text))
        )
          errors.push(
            'Computed capability access requires a literal safe property or numeric index'
          );
      }
      if (
        ts.isComputedPropertyName(node) &&
        !(
          ts.isStringLiteralLike(node.expression) &&
          !forbiddenMembers.has(node.expression.text)
        )
      )
        errors.push('Unsupported computed capability binding');
      if (
        ts.isImportDeclaration(node) &&
        ts.isStringLiteral(node.moduleSpecifier)
      ) {
        const name = node.moduleSpecifier.text;
        if (
          name === '@playwright/test' &&
          node.importClause &&
          !node.importClause.isTypeOnly
        ) {
          const bindings = node.importClause.namedBindings;
          if (
            node.importClause.name ||
            !bindings ||
            !ts.isNamedImports(bindings) ||
            bindings.elements.some(
              (e) =>
                !e.isTypeOnly &&
                ![
                  'expect',
                  'Page',
                  'Locator',
                  'BrowserContext',
                  'APIRequestContext'
                ].includes(e.propertyName?.text || e.name.text)
            )
          )
            errors.push(
              'Generated tests must import test from ' + guardedTestModule
            );
        }
        const allowedRelative =
          /^(\.\/|\.\.\/page-objects\/)[A-Za-z][A-Za-z0-9_-]*$/.test(name);
        if (!(
          allowedRelative ||
          name === guardedTestModule ||
          (dependencies.includes(name) &&
            ['@playwright/test', '@axe-core/playwright'].includes(name))
        ))
          errors.push('Unsupported dependency/import: ' + name);
      }
      if (
        ts.isIdentifier(node) &&
        [
          'process',
          'require',
          'eval',
          'Function',
          'globalThis',
          'global',
          'XMLHttpRequest',
          'WebSocket',
          'Worker',
          'navigator',
          'browser',
          'Reflect',
          '__proto__',
          'beforeAll',
          'afterAll'
        ].includes(node.text)
      )
        errors.push('Unsupported runtime capability: ' + node.text);
      if (
        ts.isIdentifier(node) &&
        node.text === 'fetch' &&
        !(
          ts.isPropertyAccessExpression(node.parent) &&
          node.parent.name === node
        )
      ) {
        let ancestor: ts.Node | undefined = node.parent;
        while (
          ancestor &&
          !(
            ts.isCallExpression(ancestor) &&
            /\.evaluate$/.test(ancestor.expression.getText(source))
          )
        )
          ancestor = ancestor.parent;
        if (!ancestor)
          errors.push(
            'Node fetch is unsupported; use the guarded request fixture'
          );
      }
      if (ts.isCallExpression(node)) {
        const call = node.expression.getText(source);

        if (
          /\.(route|unroute|unrouteAll|routeWebSocket|newContext|newPage|newCDPSession|launch|connect|extend|configure|use)$/.test(
            call
          )
        )
          errors.push('Unsupported guard bypass capability: ' + call);
        if (
          config &&
          /(^fetch$|\.(goto|fetch|get|post|put|patch|delete|head|open|sendBeacon|navigate|assign|replace)$)/.test(
            call
          )
        ) {
          const url = node.arguments[0];
          if (
            url &&
            ts.isStringLiteralLike(url) &&
            /^(https?:|\/\/)/i.test(url.text)
          )
            try {
              assertAllowedUrl(
                url.text,
                config.baseUrl,
                config.exploration.allowedOrigins
              );
            } catch (error) {
              errors.push(String(error));
            }
        }
        if (
          /\.(skip|fixme|only|fail|setTimeout|waitForTimeout)$/.test(call) ||
          call === 'import' ||
          call === 'setTimeout' ||
          call === 'setInterval'
        )
          errors.push('Unsupported test control: ' + call);
        if (
          /\.toHaveURL$/.test(call) &&
          node.arguments.some((a) => a.getText(source).includes('|'))
        )
          errors.push('Ambiguous URL assertion requires human review');
      }
      if (ts.isCatchClause(node))
        errors.push('Generated code cannot swallow failures with catch');
      ts.forEachChild(node, visit);
    }
    visit(source);
    if (/@ts-(ignore|nocheck)|\bas any\b/.test(file.code))
      errors.push('Type suppression is not allowed');
  }
  errors.push(...assertionContract(code, cases));
  return [...new Set(errors)];
}
export function typecheckDirectory(directory: string): string[] {
  const config = ts.readConfigFile('tsconfig.json', ts.sys.readFile);
  if (config.error)
    return [ts.flattenDiagnosticMessageText(config.error.messageText, '\n')];
  const parsed = ts.parseJsonConfigFileContent(
    {
      ...config.config,
      include: [path.resolve(directory).replaceAll('\\', '/') + '/**/*.ts'],
      exclude: []
    },
    ts.sys,
    process.cwd()
  );
  const program = ts.createProgram(parsed.fileNames, parsed.options);
  return [...parsed.errors, ...ts.getPreEmitDiagnostics(program)].map(
    (d) =>
      (d.file
        ? d.file.fileName +
          ':' +
          (d.file.getLineAndCharacterOfPosition(d.start || 0).line + 1) +
          ': '
        : '') +
      'TS' +
      d.code +
      ': ' +
      ts.flattenDiagnosticMessageText(d.messageText, '\n')
  );
}

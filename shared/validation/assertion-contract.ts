import ts from 'typescript';
import { GeneratedCode } from '../schemas/generated-code.schema';
import { TestCase } from '../schemas/test-case.schema';
import { extractCaseId } from './test-identity';
export const guardedTestModule =
  'multi-agentic-ai-qa-automation-framework/generated-test';
// Conservative call graph: only direct functions and explicitly constructed page objects.
// Runtime certification separately requires a completed expect step for every test.
export function assertionContract(
  code: GeneratedCode,
  cases: TestCase[]
): string[] {
  const errors: string[] = [];
  const files = [...code.pageObjects, ...code.specFiles].map((f) => ({
    ...f,
    ast: ts.createSourceFile(f.fileName, f.code, ts.ScriptTarget.Latest, true)
  }));
  const classes = new Map<
    string,
    { file: (typeof files)[number]; node: ts.ClassDeclaration }
  >();
  for (const file of files)
    for (const node of file.ast.statements)
      if (ts.isClassDeclaration(node) && node.name)
        classes.set(file.fileName.replace(/\.ts$/, '') + ':' + node.name.text, {
          file,
          node
        });
  function hasAssertion(
    body: ts.Node,
    file: (typeof files)[number],
    currentClass?: ts.ClassDeclaration,
    seen = new Set<ts.Node>()
  ): boolean {
    if (seen.has(body)) return false;
    seen = new Set(seen).add(body);
    const expects = new Set<string>();
    const importedClasses = new Map<
      string,
      { file: typeof file; node: ts.ClassDeclaration }
    >();
    const functions = new Map<string, ts.FunctionDeclaration>();
    for (const node of file.ast.statements) {
      if (ts.isFunctionDeclaration(node) && node.name)
        functions.set(node.name.text, node);
      if (
        ts.isImportDeclaration(node) &&
        ts.isStringLiteral(node.moduleSpecifier) &&
        node.importClause?.namedBindings &&
        ts.isNamedImports(node.importClause.namedBindings)
      ) {
        for (const item of node.importClause.namedBindings.elements) {
          const original = item.propertyName?.text || item.name.text;
          if (
            original === 'expect' &&
            ['@playwright/test', guardedTestModule].includes(
              node.moduleSpecifier.text
            )
          )
            expects.add(item.name.text);
          const classKey =
            node.moduleSpecifier.text.split('/').pop() + ':' + original;
          const target = classes.get(classKey);
          if (target) importedClasses.set(item.name.text, target);
        }
      }
    }
    const instances = new Map<
      string,
      { file: typeof file; node: ts.ClassDeclaration }
    >();
    function constructorTarget(expr: ts.Expression) {
      return ts.isNewExpression(expr) && ts.isIdentifier(expr.expression)
        ? importedClasses.get(expr.expression.text)
        : undefined;
    }
    let found = false;
    function visit(node: ts.Node): void {
      if (
        node !== body &&
        (ts.isFunctionLike(node) || ts.isClassDeclaration(node))
      )
        return;
      if (
        ts.isVariableDeclaration(node) &&
        ts.isIdentifier(node.name) &&
        node.initializer
      ) {
        const target = constructorTarget(node.initializer);
        if (target) instances.set(node.name.text, target);
      }
      if (ts.isCallExpression(node)) {
        // A matcher must be called, not just expect(value).
        if (ts.isPropertyAccessExpression(node.expression)) {
          let root: ts.Expression = node.expression.expression;
          while (ts.isPropertyAccessExpression(root)) root = root.expression;
          if (
            ts.isCallExpression(root) &&
            ts.isIdentifier(root.expression) &&
            expects.has(root.expression.text)
          )
            found = true;
          const receiver = node.expression.expression;
          const target =
            receiver.kind === ts.SyntaxKind.ThisKeyword && currentClass
              ? { file, node: currentClass }
              : ts.isIdentifier(receiver)
                ? instances.get(receiver.text)
                : constructorTarget(receiver);
          const method = target?.node.members.find(
            (m) =>
              ts.isMethodDeclaration(m) &&
              m.name?.getText(target.file.ast) ===
                node.expression.getLastToken()?.getText(file.ast)
          );
          if (
            target &&
            method &&
            ts.isMethodDeclaration(method) &&
            method.body &&
            hasAssertion(method.body, target.file, target.node, seen)
          )
            found = true;
        }
        if (ts.isIdentifier(node.expression)) {
          const fn = functions.get(node.expression.text);
          if (fn?.body && hasAssertion(fn.body, file, undefined, seen))
            found = true;
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(body);
    return found;
  }
  const counts = new Map<string, number>();
  for (const file of files.filter((f) =>
    code.specFiles.some((s) => s.fileName === f.fileName)
  )) {
    const tests = new Set<string>();
    for (const stmt of file.ast.statements)
      if (
        ts.isImportDeclaration(stmt) &&
        ts.isStringLiteral(stmt.moduleSpecifier) &&
        stmt.moduleSpecifier.text === guardedTestModule &&
        stmt.importClause?.namedBindings &&
        ts.isNamedImports(stmt.importClause.namedBindings)
      )
        for (const item of stmt.importClause.namedBindings.elements)
          if ((item.propertyName?.text || item.name.text) === 'test')
            tests.add(item.name.text);
    function visit(node: ts.Node): void {
      if (
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        tests.has(node.expression.text)
      ) {
        const title = node.arguments[0];
        const callback = node.arguments[node.arguments.length - 1];
        const id =
          title && ts.isStringLiteralLike(title)
            ? extractCaseId(title.text)
            : undefined;
        if (!id)
          errors.push('Malformed or missing canonical [CASE-ID] test title');
        else {
          counts.set(id, (counts.get(id) || 0) + 1);
          if (
            !callback ||
            !(
              ts.isArrowFunction(callback) || ts.isFunctionExpression(callback)
            ) ||
            !hasAssertion(callback.body, file)
          )
            errors.push('No executable assertion for approved case: ' + id);
          if (cases.length && !cases.some((c) => c.testCaseId === id))
            errors.push('Unapproved generated test: ' + id);
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(file.ast);
  }
  for (const [id, count] of counts)
    if (count !== 1) errors.push('Duplicate exact case ID: ' + id);
  for (const c of cases)
    if (counts.get(c.testCaseId) !== 1)
      errors.push('Missing or duplicate approved case: ' + c.testCaseId);
  if (!counts.size) errors.push('No guarded generated tests');
  return errors;
}

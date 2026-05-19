import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const ROOT = process.cwd();
const TARGET_DIR = path.join(ROOT, 'apps', 'admin-web', 'src');
const WRAPPER_NAMES = new Set([
  'AccessibleIconButton',
  'TooltipIconButton',
  'IconButtonWithTooltip',
]);
const BUTTON_NAMES = new Set(['button', 'Button']);

function walk(dir, out = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'dist' || entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, out);
      continue;
    }
    if (full.endsWith('.tsx') || full.endsWith('.jsx')) out.push(full);
  }
  return out;
}

function getJsxName(node) {
  if (!node) return '';
  if (ts.isIdentifier(node)) return node.text;
  if (ts.isJsxTagNameExpression(node)) return node.getText();
  return node.getText?.() || '';
}

function nodeHasMeaningfulText(node) {
  if (!node) return false;

  if (ts.isJsxText(node)) {
    return /[A-Za-z0-9]/.test(node.getText());
  }

  if (ts.isJsxExpression(node) && node.expression) {
    return true;
  }

  if (ts.isJsxElement(node) || ts.isJsxFragment(node)) {
    return node.children.some((child) => nodeHasMeaningfulText(child));
  }

  return false;
}

function hasRenderableNonTextChild(children) {
  return children.some((child) =>
    ts.isJsxElement(child) ||
    ts.isJsxSelfClosingElement(child) ||
    ts.isJsxFragment(child) ||
    (ts.isJsxExpression(child) &&
      !!child.expression &&
      (ts.isJsxElement(child.expression) || ts.isJsxFragment(child.expression))),
  );
}

function isIconLikeTagName(tagName) {
  if (!tagName) return false;
  const lowerSvgTags = new Set([
    'svg',
    'path',
    'circle',
    'line',
    'polyline',
    'polygon',
    'rect',
    'g',
    'use',
  ]);
  if (lowerSvgTags.has(tagName)) return true;
  return /^[A-Z]/.test(tagName);
}

function hasIconLikeChild(node) {
  if (!node) return false;

  if (ts.isJsxElement(node)) {
    const tagName = getJsxName(node.openingElement.tagName);
    if (isIconLikeTagName(tagName)) return true;
    return node.children.some((child) => hasIconLikeChild(child));
  }

  if (ts.isJsxFragment(node)) {
    return node.children.some((child) => hasIconLikeChild(child));
  }

  return false;
}

function isIconOnlyJsxElement(node) {
  const children = node.children ?? [];
  if (!hasRenderableNonTextChild(children)) return false;
  if (!children.some((child) => hasIconLikeChild(child))) return false;
  if (children.some((child) => nodeHasMeaningfulText(child))) return false;
  return true;
}

function hasExceptionComment(sourceFile, node) {
  const fullText = sourceFile.getFullText();
  const ranges = ts.getLeadingCommentRanges(fullText, node.pos) || [];
  return ranges.some((range) =>
    fullText
      .slice(range.pos, range.end)
      .toLowerCase()
      .includes('accessibility-exception:'),
  );
}

const files = walk(TARGET_DIR);
let totalIconOnlyButtons = 0;
let wrapperUsageCount = 0;
let exceptionCount = 0;
const violations = [];

for (const filePath of files) {
  const code = fs.readFileSync(filePath, 'utf8');
  const sourceFile = ts.createSourceFile(
    filePath,
    code,
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.JSX,
  );

  function visit(node) {
    if (ts.isJsxElement(node)) {
      const name = getJsxName(node.openingElement.tagName);

      if (WRAPPER_NAMES.has(name)) {
        wrapperUsageCount += 1;
      }

      if (BUTTON_NAMES.has(name) && isIconOnlyJsxElement(node)) {
        totalIconOnlyButtons += 1;
        if (hasExceptionComment(sourceFile, node)) {
          exceptionCount += 1;
        } else {
          const { line, character } =
            sourceFile.getLineAndCharacterOfPosition(
              node.openingElement.getStart(sourceFile),
            );
          violations.push({
            filePath,
            line: line + 1,
            column: character + 1,
            tag: name,
          });
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
}

console.log('Accessibility Icon-Only Button Audit');
console.log('-------------------------------------');
const totalIconOnlyControls = totalIconOnlyButtons + wrapperUsageCount;
console.log(`Total icon-only buttons found: ${totalIconOnlyControls}`);
console.log(`Using approved wrapper: ${wrapperUsageCount}`);
console.log(`Approved exceptions: ${exceptionCount}`);
console.log(`Violations: ${violations.length}`);

if (violations.length > 0) {
  console.log('\nViolations:');
  for (const violation of violations) {
    const rel = path.relative(ROOT, violation.filePath);
    console.log(
      `- ${rel}:${violation.line}:${violation.column} (${violation.tag})`,
    );
  }
  process.exit(1);
}

console.log('\nResult: PASS (no raw icon-only button violations).');

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import ts from 'typescript';

/**
 * US-376: every control is reachable by keyboard and has an accessible name.
 *
 * Parses every .tsx file under src with the TypeScript compiler and flags:
 *   icon-button  <Button size="icon"> with no aria-label, aria-labelledby or
 *                title, and no visible text or sr-only text among its children
 *   div-click    <div onClick> missing any of role, tabIndex, onKeyDown/onKeyUp.
 *                Exempt: aria-hidden="true" scrims (the sheet or dialog they
 *                sit behind has its own close control) and handlers that only
 *                call stopPropagation.
 *   img-alt      <img> with no alt attribute (alt="" is fine for decoration)
 *
 * An element carrying a {...spread} is skipped: the spread may supply the
 * missing prop and the parser can't see through it.
 *
 * A11Y_GUARD_VERBOSE=1 prints each offender as file:line.
 *
 * BASELINE is shrink-only, keyed by file with a per-rule count. A file may
 * never exceed its entry, and an entry larger than what the file actually has
 * fails too, so each fix has to lower (or delete) the entry in the same change.
 */
type Rule = 'icon-button' | 'div-click' | 'img-alt';

const BASELINE: Record<string, Partial<Record<Rule, number>>> = {
  // Plan picker cards; the billing workstream owns this file.
  'src/components/SubscriptionChange.tsx': { 'div-click': 1 },
};

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      if (name === 'node_modules' || name === '__tests__') continue;
      walk(path, out);
    } else if (name.endsWith('.tsx') && !/\.(test|spec|stories)\.tsx$/.test(name)) {
      out.push(path);
    }
  }
  return out;
}

type Opening = ts.JsxOpeningElement | ts.JsxSelfClosingElement;

function attrs(el: Opening) {
  const names = new Set<string>();
  let spread = false;
  let size: string | undefined;
  for (const prop of el.attributes.properties) {
    if (ts.isJsxSpreadAttribute(prop)) {
      spread = true;
      continue;
    }
    const name = prop.name.getText();
    names.add(name);
    if (name === 'size' && prop.initializer && ts.isStringLiteral(prop.initializer)) {
      size = prop.initializer.text;
    }
  }
  return { names, spread, size };
}

// True when the children give the button a name: visible text, a string
// expression, or an element whose className mentions sr-only.
function childrenName(el: Opening): boolean {
  if (!ts.isJsxOpeningElement(el)) return false;
  const parent = el.parent as ts.JsxElement;
  let named = false;
  const visit = (node: ts.Node) => {
    if (named) return;
    if (ts.isJsxText(node) && /[A-Za-z0-9]/.test(node.text)) named = true;
    else if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isTemplateExpression(node)) {
      // a string in a className doesn't name anything; sr-only is handled below
      const attr = node.parent && ts.isJsxAttribute(node.parent) ? node.parent.name.getText() : '';
      if (attr === 'className' && /\bsr-only\b/.test(node.getText())) named = true;
      else if (!attr && ts.isJsxExpression(node.parent)) named = true;
    } else ts.forEachChild(node, visit);
  };
  parent.children.forEach(visit);
  return named;
}

// onClick={(e) => e.stopPropagation()} keeps a click inside a panel from
// reaching its backdrop; it isn't an action, so it needs no keyboard twin.
function onlyStopsPropagation(el: Opening): boolean {
  for (const prop of el.attributes.properties) {
    if (!ts.isJsxAttribute(prop) || prop.name.getText() !== 'onClick') continue;
    const expr = prop.initializer && ts.isJsxExpression(prop.initializer) ? prop.initializer.expression : undefined;
    if (!expr || !ts.isArrowFunction(expr)) return false;
    return /^\{?\s*\w+\.stopPropagation\(\);?\s*\}?$/.test(expr.body.getText());
  }
  return false;
}

function scan(): Record<string, Partial<Record<Rule, number>>> {
  const found: Record<string, Partial<Record<Rule, number>>> = {};
  for (const file of walk('src')) {
    const text = readFileSync(file, 'utf8');
    if (!/<(Button|div|img)\b/.test(text)) continue;
    const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const key = relative('.', file).split('\\').join('/');
    const hit = (rule: Rule, node: ts.Node) => {
      if (process.env.A11Y_GUARD_VERBOSE) {
        const { line } = sf.getLineAndCharacterOfPosition(node.getStart());
        process.stdout.write(`${key}:${line + 1} ${rule}\n`);
      }
      found[key] ??= {};
      found[key][rule] = (found[key][rule] ?? 0) + 1;
    };
    const visit = (node: ts.Node) => {
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
        const tag = node.tagName.getText();
        const { names, spread, size } = attrs(node);
        if (!spread) {
          if (
            tag === 'Button' &&
            size === 'icon' &&
            !names.has('aria-label') &&
            !names.has('aria-labelledby') &&
            !names.has('title') &&
            !childrenName(node)
          ) {
            hit('icon-button', node);
          }
          if (
            tag === 'div' &&
            names.has('onClick') &&
            !names.has('aria-hidden') &&
            !onlyStopsPropagation(node) &&
            !(names.has('role') && names.has('tabIndex') && (names.has('onKeyDown') || names.has('onKeyUp')))
          ) {
            hit('div-click', node);
          }
          if (tag === 'img' && !names.has('alt')) hit('img-alt', node);
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
  }
  return found;
}

describe('accessible names and keyboard paths (US-376)', () => {
  const found = scan();

  it('adds no new unnamed icon buttons, mouse-only divs or alt-less images', () => {
    const over: string[] = [];
    for (const [file, rules] of Object.entries(found)) {
      for (const [rule, n] of Object.entries(rules) as [Rule, number][]) {
        const allowed = BASELINE[file]?.[rule] ?? 0;
        if (n > allowed) over.push(`${file}: ${rule} ${n} (baseline ${allowed})`);
      }
    }
    expect(
      over,
      'icon-button: add aria-label describing the action. div-click: use <button>, or add role, tabIndex={0} and an Enter/Space onKeyDown. img-alt: add alt (alt="" if decorative).',
    ).toEqual([]);
  });

  it('baseline only shrinks (no entry above the current count)', () => {
    const stale: string[] = [];
    for (const [file, rules] of Object.entries(BASELINE)) {
      for (const [rule, n] of Object.entries(rules) as [Rule, number][]) {
        const actual = found[file]?.[rule] ?? 0;
        if (n > actual) stale.push(`${file}: ${rule} baseline ${n}, actual ${actual}`);
      }
    }
    expect(stale).toEqual([]);
  });
});

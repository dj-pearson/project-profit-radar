/**
 * Automated Testing Tool - React Hooks Analyzer
 *
 * Static analysis of React hooks to detect potential issues like:
 * - Missing dependencies in useEffect/useCallback/useMemo
 * - Hooks called conditionally
 * - Infinite loop risks
 * - Memory leak patterns
 */

import * as fs from 'fs';
import * as path from 'path';
import type { HookAnalysis, HookIssue } from '../types';
import { Logger } from '../utils/logger';
import { getFiles } from '../utils/helpers';

// ============================================================================
// Types
// ============================================================================

interface HookCall {
  type: string;
  lineNumber: number;
  columnNumber: number;
  dependencies?: string[];
  code: string;
  isConditional: boolean;
  inCallback: boolean;
}

interface FileAnalysis {
  filePath: string;
  hooks: HookCall[];
  issues: HookIssue[];
  componentName?: string;
}

// ============================================================================
// Hook Patterns
// ============================================================================

const HOOK_PATTERNS = {
  useState: /useState\s*(?:<[^>]+>)?\s*\(\s*([^)]*)\)/g,
  useEffect: /useEffect\s*\(\s*(?:async\s*)?\([^)]*\)\s*=>\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}\s*,\s*\[([^\]]*)\]/gs,
  useCallback: /useCallback\s*\(\s*(?:async\s*)?\([^)]*\)\s*=>\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}\s*,\s*\[([^\]]*)\]/gs,
  useMemo: /useMemo\s*\(\s*\(\s*\)\s*=>\s*([^,]+)\s*,\s*\[([^\]]*)\]/gs,
  useRef: /useRef\s*(?:<[^>]+>)?\s*\(\s*([^)]*)\)/g,
  useContext: /useContext\s*\(\s*([^)]+)\)/g,
  custom: /use[A-Z]\w*\s*\([^)]*\)/g,
};

const CONDITIONAL_PATTERNS = [
  /if\s*\([^)]*\)\s*\{[^}]*use[A-Z]/,
  /\?\s*use[A-Z]/,
  /&&\s*use[A-Z]/,
  /\|\|\s*use[A-Z]/,
];

// ============================================================================
// Hook Analyzer
// ============================================================================

export class HookAnalyzer {
  private logger: Logger;
  private analyses: FileAnalysis[] = [];

  constructor(logger?: Logger) {
    this.logger = logger || new Logger({ context: 'HookAnalyzer' });
  }

  /**
   * Analyze all React files in a directory
   */
  async analyzeDirectory(dir: string): Promise<HookAnalysis[]> {
    this.logger.info(`Analyzing hooks in: ${dir}`);
    this.analyses = [];

    const files = getFiles(dir, /\.(tsx?|jsx?)$/);
    const reactFiles = files.filter((f) => !f.includes('node_modules'));

    for (const file of reactFiles) {
      const analysis = await this.analyzeFile(file);
      if (analysis.hooks.length > 0 || analysis.issues.length > 0) {
        this.analyses.push(analysis);
      }
    }

    // Convert to HookAnalysis format
    const results: HookAnalysis[] = [];
    for (const analysis of this.analyses) {
      for (const hook of analysis.hooks) {
        const hookIssues = analysis.issues.filter((i) =>
          i.description.includes(`line ${hook.lineNumber}`)
        );

        results.push({
          name: hook.type,
          file: analysis.filePath,
          lineNumber: hook.lineNumber,
          type: this.getHookType(hook.type),
          dependencies: hook.dependencies,
          issues: hookIssues,
        });
      }
    }

    this.logger.success(`Analyzed ${reactFiles.length} files, found ${results.length} hooks`);
    return results;
  }

  /**
   * Analyze a single file
   */
  async analyzeFile(filePath: string): Promise<FileAnalysis> {
    const content = fs.readFileSync(filePath, 'utf-8');
    const hooks: HookCall[] = [];
    const issues: HookIssue[] = [];

    // Check if it's a React component file
    if (!content.includes('React') && !content.includes('react')) {
      return { filePath, hooks, issues };
    }

    // Extract component name
    const componentMatch = content.match(/(?:function|const)\s+([A-Z]\w+)/);
    const componentName = componentMatch?.[1];

    // Find all hooks
    const lines = content.split('\n');

    // Check for conditional hook calls
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;

      for (const pattern of CONDITIONAL_PATTERNS) {
        if (pattern.test(line)) {
          issues.push({
            type: 'infinite-loop-risk',
            description: `Potential conditional hook call at line ${lineNumber}`,
            severity: 'error',
            suggestedFix: 'Hooks must be called unconditionally at the top level of the component',
          });
        }
      }
    }

    // Analyze useEffect hooks
    const useEffectMatches = content.matchAll(HOOK_PATTERNS.useEffect);
    for (const match of useEffectMatches) {
      const effectBody = match[1];
      const deps = match[2];
      const lineNumber = this.getLineNumber(content, match.index || 0);

      const dependencies = deps.trim() ? deps.split(',').map((d) => d.trim()) : [];

      hooks.push({
        type: 'useEffect',
        lineNumber,
        columnNumber: 0,
        dependencies,
        code: match[0].substring(0, 200),
        isConditional: false,
        inCallback: false,
      });

      // Check for missing dependencies
      const usedVariables = this.extractUsedVariables(effectBody);
      const missingDeps = usedVariables.filter(
        (v) => !dependencies.includes(v) && !this.isBuiltIn(v)
      );

      if (missingDeps.length > 0) {
        issues.push({
          type: 'missing-dependency',
          description: `useEffect at line ${lineNumber} may be missing dependencies: ${missingDeps.join(', ')}`,
          severity: 'warning',
          suggestedFix: `Add [${missingDeps.join(', ')}] to the dependency array`,
        });
      }

      // Check for async directly in useEffect
      if (effectBody.includes('await ') && match[0].includes('async (')) {
        issues.push({
          type: 'infinite-loop-risk',
          description: `Async function directly in useEffect at line ${lineNumber}`,
          severity: 'warning',
          suggestedFix: 'Define an async function inside useEffect and call it, rather than making the effect callback async',
        });
      }

      // Check for memory leak patterns
      if (effectBody.includes('setInterval') || effectBody.includes('setTimeout')) {
        if (!effectBody.includes('clearInterval') && !effectBody.includes('clearTimeout')) {
          issues.push({
            type: 'memory-leak',
            description: `Timer set in useEffect at line ${lineNumber} without cleanup`,
            severity: 'warning',
            suggestedFix: 'Return a cleanup function that clears the timer',
          });
        }
      }

      if (effectBody.includes('addEventListener')) {
        if (!effectBody.includes('removeEventListener')) {
          issues.push({
            type: 'memory-leak',
            description: `Event listener added in useEffect at line ${lineNumber} without cleanup`,
            severity: 'warning',
            suggestedFix: 'Return a cleanup function that removes the event listener',
          });
        }
      }

      if (effectBody.includes('subscribe') && !effectBody.includes('unsubscribe')) {
        issues.push({
          type: 'memory-leak',
          description: `Subscription in useEffect at line ${lineNumber} without cleanup`,
          severity: 'warning',
          suggestedFix: 'Return a cleanup function that unsubscribes',
        });
      }
    }

    // Analyze useCallback hooks
    const useCallbackMatches = content.matchAll(HOOK_PATTERNS.useCallback);
    for (const match of useCallbackMatches) {
      const callbackBody = match[1];
      const deps = match[2];
      const lineNumber = this.getLineNumber(content, match.index || 0);

      const dependencies = deps.trim() ? deps.split(',').map((d) => d.trim()) : [];

      hooks.push({
        type: 'useCallback',
        lineNumber,
        columnNumber: 0,
        dependencies,
        code: match[0].substring(0, 200),
        isConditional: false,
        inCallback: false,
      });

      // Check for missing dependencies
      const usedVariables = this.extractUsedVariables(callbackBody);
      const missingDeps = usedVariables.filter(
        (v) => !dependencies.includes(v) && !this.isBuiltIn(v)
      );

      if (missingDeps.length > 0) {
        issues.push({
          type: 'missing-dependency',
          description: `useCallback at line ${lineNumber} may be missing dependencies: ${missingDeps.join(', ')}`,
          severity: 'warning',
          suggestedFix: `Add [${missingDeps.join(', ')}] to the dependency array`,
        });
      }

      // Check for unnecessary useCallback (empty deps with no closure)
      if (dependencies.length === 0 && usedVariables.length === 0) {
        issues.push({
          type: 'unnecessary-dependency',
          description: `useCallback at line ${lineNumber} may be unnecessary (no dependencies)`,
          severity: 'info',
          suggestedFix: 'Consider if useCallback is needed for this function',
        });
      }
    }

    // Analyze useMemo hooks
    const useMemoMatches = content.matchAll(HOOK_PATTERNS.useMemo);
    for (const match of useMemoMatches) {
      const deps = match[2];
      const lineNumber = this.getLineNumber(content, match.index || 0);

      const dependencies = deps.trim() ? deps.split(',').map((d) => d.trim()) : [];

      hooks.push({
        type: 'useMemo',
        lineNumber,
        columnNumber: 0,
        dependencies,
        code: match[0].substring(0, 200),
        isConditional: false,
        inCallback: false,
      });
    }

    // Analyze useState hooks
    const useStateMatches = content.matchAll(HOOK_PATTERNS.useState);
    for (const match of useStateMatches) {
      const lineNumber = this.getLineNumber(content, match.index || 0);

      hooks.push({
        type: 'useState',
        lineNumber,
        columnNumber: 0,
        code: match[0].substring(0, 100),
        isConditional: false,
        inCallback: false,
      });
    }

    // Analyze useRef hooks
    const useRefMatches = content.matchAll(HOOK_PATTERNS.useRef);
    for (const match of useRefMatches) {
      const lineNumber = this.getLineNumber(content, match.index || 0);

      hooks.push({
        type: 'useRef',
        lineNumber,
        columnNumber: 0,
        code: match[0].substring(0, 100),
        isConditional: false,
        inCallback: false,
      });
    }

    // Analyze custom hooks
    const customHookMatches = content.matchAll(HOOK_PATTERNS.custom);
    for (const match of customHookMatches) {
      // Skip built-in hooks
      if (['useState', 'useEffect', 'useCallback', 'useMemo', 'useRef', 'useContext'].some(
        (h) => match[0].startsWith(h)
      )) {
        continue;
      }

      const lineNumber = this.getLineNumber(content, match.index || 0);

      hooks.push({
        type: match[0].split('(')[0].trim(),
        lineNumber,
        columnNumber: 0,
        code: match[0].substring(0, 100),
        isConditional: false,
        inCallback: false,
      });
    }

    return { filePath, hooks, issues, componentName };
  }

  /**
   * Get line number from character index
   */
  private getLineNumber(content: string, index: number): number {
    const lines = content.substring(0, index).split('\n');
    return lines.length;
  }

  /**
   * Extract used variables from code
   */
  private extractUsedVariables(code: string): string[] {
    const variables: string[] = [];

    // Match variable references (simplified)
    const varPattern = /\b([a-z_$][a-zA-Z0-9_$]*)\b/g;
    let match;

    while ((match = varPattern.exec(code)) !== null) {
      const varName = match[1];

      // Skip keywords and built-ins
      if (!this.isKeyword(varName) && !variables.includes(varName)) {
        variables.push(varName);
      }
    }

    return variables;
  }

  /**
   * Check if identifier is a JavaScript keyword
   */
  private isKeyword(name: string): boolean {
    const keywords = [
      'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue',
      'return', 'function', 'const', 'let', 'var', 'class', 'extends', 'new',
      'this', 'super', 'import', 'export', 'default', 'try', 'catch', 'finally',
      'throw', 'async', 'await', 'yield', 'typeof', 'instanceof', 'in', 'of',
      'true', 'false', 'null', 'undefined', 'void', 'delete',
    ];
    return keywords.includes(name);
  }

  /**
   * Check if identifier is a built-in
   */
  private isBuiltIn(name: string): boolean {
    const builtIns = [
      'console', 'window', 'document', 'Math', 'JSON', 'Date', 'Array', 'Object',
      'String', 'Number', 'Boolean', 'Error', 'Promise', 'Set', 'Map', 'WeakMap',
      'WeakSet', 'Symbol', 'Proxy', 'Reflect', 'setTimeout', 'setInterval',
      'clearTimeout', 'clearInterval', 'fetch', 'alert', 'confirm', 'prompt',
    ];
    return builtIns.includes(name);
  }

  /**
   * Get hook type classification
   */
  private getHookType(hookName: string): HookAnalysis['type'] {
    switch (hookName) {
      case 'useState':
        return 'useState';
      case 'useEffect':
        return 'useEffect';
      case 'useCallback':
        return 'useCallback';
      case 'useMemo':
        return 'useMemo';
      case 'useRef':
        return 'useRef';
      case 'useContext':
        return 'useContext';
      default:
        return 'custom';
    }
  }

  /**
   * Get analysis summary
   */
  getSummary(): {
    totalHooks: number;
    totalIssues: number;
    issuesByType: Record<string, number>;
    issuesBySeverity: Record<string, number>;
    filesWithIssues: number;
  } {
    const allIssues = this.analyses.flatMap((a) => a.issues);

    const issuesByType: Record<string, number> = {};
    const issuesBySeverity: Record<string, number> = {};

    for (const issue of allIssues) {
      issuesByType[issue.type] = (issuesByType[issue.type] || 0) + 1;
      issuesBySeverity[issue.severity] = (issuesBySeverity[issue.severity] || 0) + 1;
    }

    return {
      totalHooks: this.analyses.reduce((sum, a) => sum + a.hooks.length, 0),
      totalIssues: allIssues.length,
      issuesByType,
      issuesBySeverity,
      filesWithIssues: this.analyses.filter((a) => a.issues.length > 0).length,
    };
  }

  /**
   * Get all issues
   */
  getAllIssues(): { file: string; issue: HookIssue }[] {
    const results: { file: string; issue: HookIssue }[] = [];

    for (const analysis of this.analyses) {
      for (const issue of analysis.issues) {
        results.push({
          file: analysis.filePath,
          issue,
        });
      }
    }

    return results;
  }
}

// ============================================================================
// Export
// ============================================================================

export default HookAnalyzer;

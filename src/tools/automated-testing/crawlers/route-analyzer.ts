/**
 * Automated Testing Tool - Route Analyzer
 *
 * Statically analyzes route files to discover all defined routes.
 * Works with React Router, Next.js, and similar routing patterns.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { DiscoveredRoute } from '../types';
import { Logger } from '../utils/logger';
import { getFiles } from '../utils/helpers';

// ============================================================================
// Types
// ============================================================================

interface RouteMatch {
  path: string;
  component?: string;
  element?: string;
  lazy?: boolean;
  children?: RouteMatch[];
  index?: boolean;
}

// ============================================================================
// Route Analyzer
// ============================================================================

export class RouteAnalyzer {
  private logger: Logger;
  private discoveredRoutes: DiscoveredRoute[] = [];

  constructor(logger?: Logger) {
    this.logger = logger || new Logger({ context: 'RouteAnalyzer' });
  }

  /**
   * Analyze route files in a directory
   */
  async analyzeRoutes(routesDir: string): Promise<DiscoveredRoute[]> {
    this.logger.info(`Analyzing routes in: ${routesDir}`);
    this.discoveredRoutes = [];

    if (!fs.existsSync(routesDir)) {
      this.logger.warn(`Routes directory not found: ${routesDir}`);
      return [];
    }

    // Find all route-related files
    const routeFiles = getFiles(routesDir, /\.(tsx?|jsx?)$/);
    this.logger.debug(`Found ${routeFiles.length} potential route files`);

    for (const file of routeFiles) {
      await this.analyzeRouteFile(file);
    }

    // Deduplicate and normalize routes
    const uniqueRoutes = this.deduplicateRoutes(this.discoveredRoutes);
    this.logger.success(`Discovered ${uniqueRoutes.length} unique routes`);

    return uniqueRoutes;
  }

  /**
   * Analyze a single route file
   */
  private async analyzeRouteFile(filePath: string): Promise<void> {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const routes = this.extractRoutes(content, filePath);

      for (const route of routes) {
        this.discoveredRoutes.push(route);
      }

      if (routes.length > 0) {
        this.logger.debug(`Found ${routes.length} routes in ${path.basename(filePath)}`);
      }
    } catch (error) {
      this.logger.warn(`Failed to analyze ${filePath}: ${(error as Error).message}`);
    }
  }

  /**
   * Extract routes from file content using regex patterns
   */
  private extractRoutes(content: string, filePath: string): DiscoveredRoute[] {
    const routes: DiscoveredRoute[] = [];

    // Pattern 1: React Router <Route path="..." />
    const routePatterns = [
      // <Route path="/dashboard" element={<Dashboard />} />
      /<Route\s+[^>]*path=["']([^"']+)["'][^>]*(?:element=\{<(\w+)[^}]*\})?/g,
      // <Route path="/dashboard" component={Dashboard} />
      /<Route\s+[^>]*path=["']([^"']+)["'][^>]*(?:component=\{(\w+)\})?/g,
      // path: "/dashboard" (object syntax)
      /path:\s*["']([^"']+)["']/g,
      // { path: "/dashboard", element: <Dashboard /> }
      /{\s*path:\s*["']([^"']+)["'][^}]*(?:element:\s*<(\w+))?/g,
    ];

    for (const pattern of routePatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const routePath = match[1];
        const componentName = match[2];

        // Skip invalid paths
        if (!routePath || routePath.startsWith('*') || routePath === '') {
          continue;
        }

        // Normalize path
        const normalizedPath = this.normalizePath(routePath);

        routes.push({
          path: normalizedPath,
          componentName,
          sourceFile: filePath,
          requiresAuth: this.detectAuthRequirement(content, routePath),
          params: this.extractRouteParams(normalizedPath),
        });
      }
    }

    // Pattern 2: Lazy imports to find component names
    const lazyPattern = /const\s+(\w+)\s*=\s*lazy\s*\(\s*\(\s*\)\s*=>\s*import\s*\(\s*["']([^"']+)["']/g;
    let lazyMatch;
    while ((lazyMatch = lazyPattern.exec(content)) !== null) {
      const componentName = lazyMatch[1];
      const importPath = lazyMatch[2];

      // Update routes with component info
      for (const route of routes) {
        if (route.componentName === componentName) {
          route.meta = {
            ...route.meta,
            lazy: true,
            importPath,
          };
        }
      }
    }

    return routes;
  }

  /**
   * Normalize a route path
   */
  private normalizePath(routePath: string): string {
    // Ensure leading slash
    let normalized = routePath.startsWith('/') ? routePath : `/${routePath}`;

    // Remove trailing slash (except for root)
    if (normalized !== '/' && normalized.endsWith('/')) {
      normalized = normalized.slice(0, -1);
    }

    return normalized;
  }

  /**
   * Extract route parameters (e.g., :id, :slug)
   */
  private extractRouteParams(routePath: string): string[] {
    const paramPattern = /:(\w+)/g;
    const params: string[] = [];
    let match;

    while ((match = paramPattern.exec(routePath)) !== null) {
      params.push(match[1]);
    }

    return params;
  }

  /**
   * Detect if a route requires authentication
   */
  private detectAuthRequirement(content: string, routePath: string): boolean {
    // Check for common auth patterns
    const authPatterns = [
      /ProtectedRoute/i,
      /RequireAuth/i,
      /AuthGuard/i,
      /isAuthenticated/i,
      /requiresAuth:\s*true/i,
      /private:\s*true/i,
    ];

    // Check content around the route path
    const routeIndex = content.indexOf(routePath);
    if (routeIndex !== -1) {
      // Check surrounding 500 characters
      const context = content.substring(
        Math.max(0, routeIndex - 500),
        Math.min(content.length, routeIndex + 500)
      );

      for (const pattern of authPatterns) {
        if (pattern.test(context)) {
          return true;
        }
      }
    }

    // Check if route is under known protected paths
    const protectedPaths = [
      '/dashboard',
      '/settings',
      '/admin',
      '/profile',
      '/account',
      '/projects',
      '/invoices',
      '/reports',
    ];

    return protectedPaths.some((p) => routePath.startsWith(p));
  }

  /**
   * Deduplicate discovered routes
   */
  private deduplicateRoutes(routes: DiscoveredRoute[]): DiscoveredRoute[] {
    const seen = new Map<string, DiscoveredRoute>();

    for (const route of routes) {
      const existing = seen.get(route.path);
      if (!existing || (route.componentName && !existing.componentName)) {
        seen.set(route.path, route);
      }
    }

    return Array.from(seen.values()).sort((a, b) => a.path.localeCompare(b.path));
  }

  /**
   * Get routes that can be tested (non-parameterized or with test values)
   */
  getTestableRoutes(routes: DiscoveredRoute[]): { path: string; original: string }[] {
    const testable: { path: string; original: string }[] = [];

    for (const route of routes) {
      if (route.params && route.params.length > 0) {
        // Replace params with test values
        let testPath = route.path;
        for (const param of route.params) {
          testPath = testPath.replace(`:${param}`, `test-${param}`);
        }
        testable.push({ path: testPath, original: route.path });
      } else {
        testable.push({ path: route.path, original: route.path });
      }
    }

    return testable;
  }

  /**
   * Analyze pages directory for file-based routing
   */
  async analyzePagesDirectory(pagesDir: string): Promise<DiscoveredRoute[]> {
    this.logger.info(`Analyzing pages directory: ${pagesDir}`);
    const routes: DiscoveredRoute[] = [];

    if (!fs.existsSync(pagesDir)) {
      this.logger.warn(`Pages directory not found: ${pagesDir}`);
      return routes;
    }

    const pageFiles = getFiles(pagesDir, /\.(tsx?|jsx?)$/);

    for (const file of pageFiles) {
      const relativePath = path.relative(pagesDir, file);
      const routePath = this.filePathToRoutePath(relativePath);

      if (routePath) {
        routes.push({
          path: routePath,
          componentName: this.extractComponentNameFromFile(file),
          sourceFile: file,
          requiresAuth: this.detectAuthRequirement(fs.readFileSync(file, 'utf-8'), routePath),
          params: this.extractRouteParams(routePath),
        });
      }
    }

    this.logger.success(`Found ${routes.length} page-based routes`);
    return routes;
  }

  /**
   * Convert file path to route path
   */
  private filePathToRoutePath(filePath: string): string | null {
    // Remove extension
    let routePath = filePath.replace(/\.(tsx?|jsx?)$/, '');

    // Handle index files
    routePath = routePath.replace(/\/index$/, '');

    // Convert to route format
    routePath = '/' + routePath;

    // Handle dynamic segments [id] -> :id
    routePath = routePath.replace(/\[(\w+)\]/g, ':$1');

    // Skip utility files
    if (routePath.includes('/_') || routePath.includes('/components/')) {
      return null;
    }

    return routePath || '/';
  }

  /**
   * Extract component name from file
   */
  private extractComponentNameFromFile(filePath: string): string {
    const content = fs.readFileSync(filePath, 'utf-8');

    // Look for export default
    const defaultExportPattern = /export\s+default\s+(?:function\s+)?(\w+)/;
    const match = defaultExportPattern.exec(content);

    if (match) {
      return match[1];
    }

    // Use filename as component name
    const fileName = path.basename(filePath, path.extname(filePath));
    return fileName.charAt(0).toUpperCase() + fileName.slice(1);
  }
}

// ============================================================================
// Export
// ============================================================================

export default RouteAnalyzer;

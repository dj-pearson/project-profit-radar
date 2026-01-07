/**
 * Automated Testing Tool - Edge Function Tester
 *
 * Tests Supabase Edge Functions for availability, CORS, and basic functionality.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { TestConfig, EdgeFunction, EdgeFunctionTestResult } from '../types';
import { Logger } from '../utils/logger';
import { getDirectories, sleep } from '../utils/helpers';

// ============================================================================
// Edge Function Tester
// ============================================================================

export class EdgeFunctionTester {
  private logger: Logger;
  private config: TestConfig;
  private supabaseUrl: string;
  private edgeFunctionsUrl: string;

  constructor(config: TestConfig, logger?: Logger) {
    this.config = config;
    this.logger = logger || new Logger({ context: 'EdgeFunctionTester' });
    
    // Support multiple ways to configure Supabase URL for flexibility
    // Priority: config.supabaseUrl > SUPABASE_URL env var > VITE_SUPABASE_URL (from .env) > localhost fallback
    this.supabaseUrl = 
      (config as any).supabaseUrl || 
      process.env.SUPABASE_URL || 
      process.env.VITE_SUPABASE_URL || 
      'http://localhost:54321';
    
    // Edge functions URL can be separate for self-hosted setups
    // Priority: config.edgeFunctionsUrl > EDGE_FUNCTIONS_URL > default path
    this.edgeFunctionsUrl = 
      (config as any).edgeFunctionsUrl || 
      process.env.EDGE_FUNCTIONS_URL || 
      process.env.VITE_EDGE_FUNCTIONS_URL || 
      `${this.supabaseUrl}/functions/v1`;
    
    this.logger.debug(`Supabase URL: ${this.supabaseUrl}`);
    this.logger.debug(`Edge Functions URL: ${this.edgeFunctionsUrl}`);
  }

  /**
   * Discover all edge functions
   */
  async discoverFunctions(functionsDir: string): Promise<EdgeFunction[]> {
    this.logger.info(`Discovering edge functions in: ${functionsDir}`);
    const functions: EdgeFunction[] = [];

    if (!fs.existsSync(functionsDir)) {
      this.logger.warn(`Functions directory not found: ${functionsDir}`);
      return functions;
    }

    const directories = getDirectories(functionsDir);

    for (const dir of directories) {
      // Skip shared directories
      if (dir.startsWith('_')) continue;

      const functionPath = path.join(functionsDir, dir);
      const indexFile = path.join(functionPath, 'index.ts');

      if (fs.existsSync(indexFile)) {
        const sourceCode = fs.readFileSync(indexFile, 'utf-8');
        const functionInfo = this.analyzeFunction(dir, functionPath, sourceCode);
        functions.push(functionInfo);
      }
    }

    this.logger.success(`Discovered ${functions.length} edge functions`);
    return functions;
  }

  /**
   * Analyze a function's source code
   */
  private analyzeFunction(name: string, functionPath: string, sourceCode: string): EdgeFunction {
    // Detect HTTP methods
    const methods: string[] = [];
    if (sourceCode.includes("method === 'GET'") || sourceCode.includes('req.method === "GET"')) {
      methods.push('GET');
    }
    if (sourceCode.includes("method === 'POST'") || sourceCode.includes('req.method === "POST"')) {
      methods.push('POST');
    }
    if (sourceCode.includes("method === 'PUT'") || sourceCode.includes('req.method === "PUT"')) {
      methods.push('PUT');
    }
    if (sourceCode.includes("method === 'DELETE'") || sourceCode.includes('req.method === "DELETE"')) {
      methods.push('DELETE');
    }
    if (sourceCode.includes("method === 'PATCH'") || sourceCode.includes('req.method === "PATCH"')) {
      methods.push('PATCH');
    }
    if (sourceCode.includes("method === 'OPTIONS'") || sourceCode.includes('OPTIONS')) {
      methods.push('OPTIONS');
    }

    // If no specific methods found, assume it handles all
    if (methods.length === 0) {
      methods.push('POST', 'OPTIONS');
    }

    // Detect if function requires auth
    const requiresAuth =
      sourceCode.includes('Authorization') ||
      sourceCode.includes('auth.getUser') ||
      sourceCode.includes('verifyJwt') ||
      sourceCode.includes('authHeader');

    // Construct endpoint URL
    // If edgeFunctionsUrl already includes /v1 or /functions/v1, don't duplicate it
    let endpoint: string;
    if (this.edgeFunctionsUrl.includes('/functions/v1')) {
      endpoint = `${this.edgeFunctionsUrl}/${name}`;
    } else if (this.edgeFunctionsUrl.endsWith('/v1')) {
      endpoint = `${this.edgeFunctionsUrl}/${name}`;
    } else {
      endpoint = `${this.edgeFunctionsUrl}/${name}`;
    }
    
    return {
      name,
      path: functionPath,
      endpoint,
      methods,
      requiresAuth,
      sourceCode: sourceCode.substring(0, 5000), // Truncate for storage
    };
  }

  /**
   * Test all discovered functions
   */
  async testFunctions(functions: EdgeFunction[]): Promise<EdgeFunctionTestResult[]> {
    const results: EdgeFunctionTestResult[] = [];

    for (const func of functions) {
      this.logger.debug(`Testing function: ${func.name}`);
      const result = await this.testFunction(func);
      results.push(result);

      // Small delay between requests
      await sleep(100);
    }

    return results;
  }

  /**
   * Test a single edge function
   */
  async testFunction(func: EdgeFunction): Promise<EdgeFunctionTestResult> {
    const result: EdgeFunctionTestResult = {
      name: func.name,
      timestamp: new Date(),
      reachable: false,
    };

    try {
      // Test OPTIONS (CORS preflight)
      const corsResult = await this.testCors(func);
      result.corsHeaders = corsResult.headers;

      // Test without auth
      const noAuthResult = await this.testEndpoint(func, false);
      result.authTest = {
        withoutAuth: {
          status: noAuthResult.status,
          error: noAuthResult.error,
        },
      };

      // Determine if reachable (even 401/403 means function is running)
      result.reachable = noAuthResult.status !== 0;
      result.statusCode = noAuthResult.status;
      result.responseTime = noAuthResult.responseTime;

      // If function requires auth, test with auth token
      if (func.requiresAuth && process.env.SUPABASE_SERVICE_ROLE_KEY) {
        const authResult = await this.testEndpoint(func, true);
        result.authTest.withAuth = {
          status: authResult.status,
          error: authResult.error,
        };
      }
    } catch (error) {
      result.error = (error as Error).message;
    }

    return result;
  }

  /**
   * Test CORS headers
   */
  private async testCors(
    func: EdgeFunction
  ): Promise<{ headers: Record<string, string>; error?: string }> {
    try {
      const response = await fetch(func.endpoint, {
        method: 'OPTIONS',
        headers: {
          'Origin': 'http://localhost:8080',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'content-type, authorization',
        },
      });

      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        if (key.toLowerCase().startsWith('access-control')) {
          headers[key] = value;
        }
      });

      return { headers };
    } catch (error) {
      return { headers: {}, error: (error as Error).message };
    }
  }

  /**
   * Test an endpoint with or without auth
   */
  private async testEndpoint(
    func: EdgeFunction,
    withAuth: boolean
  ): Promise<{
    status: number;
    responseTime: number;
    body?: string;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (withAuth && process.env.SUPABASE_SERVICE_ROLE_KEY) {
        headers['Authorization'] = `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`;
      }

      // Use POST with empty body for most functions
      const method = func.methods.includes('POST') ? 'POST' : func.methods[0];

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(func.endpoint, {
        method,
        headers,
        body: method !== 'GET' ? JSON.stringify({}) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const responseTime = Date.now() - startTime;
      let body: string | undefined;

      try {
        body = await response.text();
        if (body.length > 500) {
          body = body.substring(0, 500) + '...';
        }
      } catch {
        // Ignore body read errors
      }

      return {
        status: response.status,
        responseTime,
        body,
      };
    } catch (error) {
      return {
        status: 0,
        responseTime: Date.now() - startTime,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Generate summary of test results
   */
  generateSummary(results: EdgeFunctionTestResult[]): {
    total: number;
    reachable: number;
    healthy: number;
    failing: number;
    avgResponseTime: number;
  } {
    const reachable = results.filter((r) => r.reachable);
    const healthy = results.filter(
      (r) => r.reachable && r.statusCode && r.statusCode >= 200 && r.statusCode < 500
    );
    const failing = results.filter((r) => !r.reachable || (r.statusCode && r.statusCode >= 500));

    const responseTimes = results
      .filter((r) => r.responseTime)
      .map((r) => r.responseTime as number);

    const avgResponseTime =
      responseTimes.length > 0
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        : 0;

    return {
      total: results.length,
      reachable: reachable.length,
      healthy: healthy.length,
      failing: failing.length,
      avgResponseTime: Math.round(avgResponseTime),
    };
  }
}

// ============================================================================
// Export
// ============================================================================

export default EdgeFunctionTester;

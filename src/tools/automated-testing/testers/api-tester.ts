/**
 * Automated Testing Tool - API Tester
 *
 * Tests API endpoints with schema validation, response time checks,
 * and contract verification.
 */

import type { TestConfig, TestResult, NetworkRequest } from '../types';
import { Logger } from '../utils/logger';
import { generateId, formatDuration } from '../utils/helpers';

// ============================================================================
// Types
// ============================================================================

export interface ApiEndpoint {
  /** Endpoint name/description */
  name: string;
  /** HTTP method */
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  /** Endpoint URL (can include path params like /users/:id) */
  url: string;
  /** Request headers */
  headers?: Record<string, string>;
  /** Request body (for POST/PUT/PATCH) */
  body?: unknown;
  /** Expected response schema */
  responseSchema?: JsonSchema;
  /** Expected status code(s) */
  expectedStatus?: number | number[];
  /** Maximum response time (ms) */
  maxResponseTime?: number;
  /** Whether endpoint requires authentication */
  requiresAuth?: boolean;
  /** Tags for filtering */
  tags?: string[];
}

export interface JsonSchema {
  type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  required?: string[];
  enum?: unknown[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  nullable?: boolean;
}

export interface ApiTestResult extends TestResult {
  data: {
    endpoint: string;
    method: string;
    statusCode: number;
    responseTime: number;
    schemaValid?: boolean;
    schemaErrors?: string[];
    responseBody?: unknown;
    requestBody?: unknown;
  };
}

// ============================================================================
// API Tester
// ============================================================================

export class ApiTester {
  private logger: Logger;
  private config: TestConfig;
  private authToken?: string;
  private baseUrl: string;

  constructor(config: TestConfig, logger?: Logger) {
    this.config = config;
    this.baseUrl = config.baseUrl;
    this.logger = logger || new Logger({ context: 'ApiTester' });
  }

  /**
   * Set authentication token
   */
  setAuthToken(token: string): void {
    this.authToken = token;
  }

  /**
   * Set base URL for API calls
   */
  setBaseUrl(url: string): void {
    this.baseUrl = url;
  }

  /**
   * Test a single API endpoint
   */
  async testEndpoint(endpoint: ApiEndpoint): Promise<ApiTestResult> {
    const startTime = Date.now();
    const testId = generateId();
    const fullUrl = this.buildUrl(endpoint.url);

    try {
      // Build headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...endpoint.headers,
      };

      // Add auth if required
      if (endpoint.requiresAuth && this.authToken) {
        headers['Authorization'] = `Bearer ${this.authToken}`;
      }

      // Make request
      const response = await fetch(fullUrl, {
        method: endpoint.method,
        headers,
        body: endpoint.body ? JSON.stringify(endpoint.body) : undefined,
      });

      const responseTime = Date.now() - startTime;
      const statusCode = response.status;

      // Get response body
      let responseBody: unknown;
      try {
        responseBody = await response.json();
      } catch {
        responseBody = await response.text();
      }

      // Validate status code
      const expectedStatuses = Array.isArray(endpoint.expectedStatus)
        ? endpoint.expectedStatus
        : [endpoint.expectedStatus || 200];

      const statusValid = expectedStatuses.includes(statusCode);

      // Validate response time
      const responseTimeValid = endpoint.maxResponseTime
        ? responseTime <= endpoint.maxResponseTime
        : true;

      // Validate schema
      let schemaValid = true;
      let schemaErrors: string[] = [];

      if (endpoint.responseSchema && statusCode >= 200 && statusCode < 300) {
        const validation = this.validateSchema(responseBody, endpoint.responseSchema);
        schemaValid = validation.valid;
        schemaErrors = validation.errors;
      }

      // Determine overall status
      const allValid = statusValid && responseTimeValid && schemaValid;

      return {
        id: testId,
        type: 'api-call',
        name: `API: ${endpoint.name}`,
        status: allValid ? 'passed' : 'failed',
        url: fullUrl,
        duration: responseTime,
        timestamp: new Date(),
        retryCount: 0,
        data: {
          endpoint: endpoint.url,
          method: endpoint.method,
          statusCode,
          responseTime,
          schemaValid,
          schemaErrors: schemaErrors.length > 0 ? schemaErrors : undefined,
          responseBody: typeof responseBody === 'object' ? responseBody : undefined,
          requestBody: endpoint.body,
        },
        error: !allValid
          ? {
              message: this.buildErrorMessage(statusValid, responseTimeValid, schemaValid, schemaErrors, statusCode, responseTime, endpoint),
              classification: 'network',
            }
          : undefined,
      };
    } catch (error) {
      return {
        id: testId,
        type: 'api-call',
        name: `API: ${endpoint.name}`,
        status: 'error',
        url: fullUrl,
        duration: Date.now() - startTime,
        timestamp: new Date(),
        retryCount: 0,
        data: {
          endpoint: endpoint.url,
          method: endpoint.method,
          statusCode: 0,
          responseTime: Date.now() - startTime,
        },
        error: {
          message: (error as Error).message,
          classification: 'network',
        },
      };
    }
  }

  /**
   * Test multiple endpoints
   */
  async testEndpoints(endpoints: ApiEndpoint[]): Promise<ApiTestResult[]> {
    const results: ApiTestResult[] = [];

    for (const endpoint of endpoints) {
      this.logger.debug(`Testing: ${endpoint.method} ${endpoint.url}`);
      const result = await this.testEndpoint(endpoint);
      results.push(result);
    }

    return results;
  }

  /**
   * Validate response against JSON schema
   */
  validateSchema(
    data: unknown,
    schema: JsonSchema,
    path: string = ''
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Handle null
    if (data === null) {
      if (schema.nullable) {
        return { valid: true, errors: [] };
      }
      errors.push(`${path || 'root'}: expected ${schema.type}, got null`);
      return { valid: false, errors };
    }

    // Check type
    const actualType = Array.isArray(data) ? 'array' : typeof data;

    if (schema.type !== actualType) {
      errors.push(`${path || 'root'}: expected ${schema.type}, got ${actualType}`);
      return { valid: false, errors };
    }

    // Validate based on type
    switch (schema.type) {
      case 'object':
        if (schema.properties) {
          const obj = data as Record<string, unknown>;

          // Check required properties
          if (schema.required) {
            for (const prop of schema.required) {
              if (!(prop in obj)) {
                errors.push(`${path}.${prop}: required property is missing`);
              }
            }
          }

          // Validate each property
          for (const [key, propSchema] of Object.entries(schema.properties)) {
            if (key in obj) {
              const propValidation = this.validateSchema(obj[key], propSchema, `${path}.${key}`);
              errors.push(...propValidation.errors);
            }
          }
        }
        break;

      case 'array':
        if (schema.items) {
          const arr = data as unknown[];
          arr.forEach((item, index) => {
            const itemValidation = this.validateSchema(item, schema.items!, `${path}[${index}]`);
            errors.push(...itemValidation.errors);
          });
        }
        break;

      case 'string':
        const str = data as string;
        if (schema.minLength && str.length < schema.minLength) {
          errors.push(`${path}: string length ${str.length} is less than minimum ${schema.minLength}`);
        }
        if (schema.maxLength && str.length > schema.maxLength) {
          errors.push(`${path}: string length ${str.length} exceeds maximum ${schema.maxLength}`);
        }
        if (schema.pattern) {
          const regex = new RegExp(schema.pattern);
          if (!regex.test(str)) {
            errors.push(`${path}: string does not match pattern ${schema.pattern}`);
          }
        }
        if (schema.enum && !schema.enum.includes(str)) {
          errors.push(`${path}: value must be one of ${schema.enum.join(', ')}`);
        }
        break;

      case 'number':
        const num = data as number;
        if (schema.minimum !== undefined && num < schema.minimum) {
          errors.push(`${path}: value ${num} is less than minimum ${schema.minimum}`);
        }
        if (schema.maximum !== undefined && num > schema.maximum) {
          errors.push(`${path}: value ${num} exceeds maximum ${schema.maximum}`);
        }
        break;
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Build full URL from endpoint path
   */
  private buildUrl(path: string): string {
    if (path.startsWith('http')) {
      return path;
    }
    const base = this.baseUrl.endsWith('/') ? this.baseUrl.slice(0, -1) : this.baseUrl;
    const endpoint = path.startsWith('/') ? path : `/${path}`;
    return `${base}${endpoint}`;
  }

  /**
   * Build error message
   */
  private buildErrorMessage(
    statusValid: boolean,
    responseTimeValid: boolean,
    schemaValid: boolean,
    schemaErrors: string[],
    statusCode: number,
    responseTime: number,
    endpoint: ApiEndpoint
  ): string {
    const messages: string[] = [];

    if (!statusValid) {
      const expected = Array.isArray(endpoint.expectedStatus)
        ? endpoint.expectedStatus.join(' or ')
        : endpoint.expectedStatus || 200;
      messages.push(`Expected status ${expected}, got ${statusCode}`);
    }

    if (!responseTimeValid) {
      messages.push(`Response time ${responseTime}ms exceeds maximum ${endpoint.maxResponseTime}ms`);
    }

    if (!schemaValid) {
      messages.push(`Schema validation failed: ${schemaErrors.join('; ')}`);
    }

    return messages.join('. ');
  }

  /**
   * Create schema from TypeScript-like definition
   */
  static createSchema(definition: {
    type: JsonSchema['type'];
    properties?: Record<string, { type: JsonSchema['type']; required?: boolean; nullable?: boolean }>;
    items?: { type: JsonSchema['type'] };
  }): JsonSchema {
    const schema: JsonSchema = { type: definition.type };

    if (definition.properties) {
      schema.properties = {};
      schema.required = [];

      for (const [key, prop] of Object.entries(definition.properties)) {
        schema.properties[key] = { type: prop.type, nullable: prop.nullable };
        if (prop.required) {
          schema.required.push(key);
        }
      }
    }

    if (definition.items) {
      schema.items = { type: definition.items.type };
    }

    return schema;
  }

  /**
   * Generate common API endpoint definitions
   */
  static commonEndpoints(baseUrl: string): ApiEndpoint[] {
    return [
      {
        name: 'Health Check',
        method: 'GET',
        url: `${baseUrl}/health`,
        expectedStatus: 200,
        maxResponseTime: 1000,
      },
      {
        name: 'API Version',
        method: 'GET',
        url: `${baseUrl}/version`,
        expectedStatus: [200, 404],
        maxResponseTime: 1000,
      },
    ];
  }
}

// ============================================================================
// Export
// ============================================================================

export default ApiTester;

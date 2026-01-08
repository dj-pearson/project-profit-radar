/**
 * Automated Testing Tool - Environment Configuration
 *
 * Manages environment-specific configurations for testing across
 * different environments (development, staging, production).
 */

import * as fs from 'fs';
import * as path from 'path';
import type { TestConfig, AuthConfig } from '../types';
import { Logger } from '../utils/logger';
import { mergeConfig } from '../config';

// ============================================================================
// Types
// ============================================================================

export type EnvironmentName = 'development' | 'staging' | 'production' | 'local' | 'ci' | string;

export interface EnvironmentConfig {
  /** Environment name */
  name: EnvironmentName;
  /** Base URL for this environment */
  baseUrl: string;
  /** Supabase/API URL */
  apiUrl?: string;
  /** Auth configuration */
  auth?: AuthConfig;
  /** Environment-specific test settings */
  testSettings?: Partial<TestConfig>;
  /** Environment variables to set */
  envVars?: Record<string, string>;
  /** Skip certain tests in this environment */
  skipTests?: string[];
  /** Environment-specific exclude patterns */
  excludePatterns?: string[];
  /** Timeout multiplier (e.g., 2 for slower environments) */
  timeoutMultiplier?: number;
  /** Custom headers to send with requests */
  headers?: Record<string, string>;
  /** Whether this environment requires VPN/special access */
  requiresVpn?: boolean;
  /** Notes about this environment */
  notes?: string;
}

export interface EnvironmentFile {
  version: string;
  defaultEnvironment: EnvironmentName;
  environments: Record<EnvironmentName, EnvironmentConfig>;
}

// ============================================================================
// Default Environments
// ============================================================================

const DEFAULT_ENVIRONMENTS: Record<string, EnvironmentConfig> = {
  local: {
    name: 'local',
    baseUrl: 'http://localhost:8080',
    apiUrl: 'http://localhost:54321',
    testSettings: {
      headless: false,
      screenshots: true,
      video: false,
      maxPages: 20,
    },
    timeoutMultiplier: 1,
    notes: 'Local development environment',
  },
  development: {
    name: 'development',
    baseUrl: 'http://localhost:8080',
    apiUrl: 'http://localhost:54321',
    testSettings: {
      headless: true,
      screenshots: true,
      maxPages: 50,
    },
    timeoutMultiplier: 1,
    notes: 'Development environment',
  },
  staging: {
    name: 'staging',
    baseUrl: 'https://staging.build-desk.com',
    apiUrl: 'https://staging-api.build-desk.com',
    testSettings: {
      headless: true,
      screenshots: true,
      maxPages: 100,
    },
    timeoutMultiplier: 1.5,
    excludePatterns: ['/admin/debug', '/dev-tools'],
    notes: 'Staging environment - pre-production testing',
  },
  production: {
    name: 'production',
    baseUrl: 'https://build-desk.com',
    apiUrl: 'https://api.build-desk.com',
    testSettings: {
      headless: true,
      screenshots: true,
      depth: 'shallow',
      maxPages: 30,
    },
    timeoutMultiplier: 2,
    skipTests: ['form-submission', 'button-click'],
    excludePatterns: ['/admin', '/settings/billing', '/stripe'],
    notes: 'Production environment - read-only tests only',
  },
  ci: {
    name: 'ci',
    baseUrl: 'http://localhost:8080',
    testSettings: {
      headless: true,
      screenshots: true,
      video: false,
      retries: 3,
      parallel: {
        enabled: true,
        workers: 4,
      },
    },
    timeoutMultiplier: 1,
    notes: 'CI/CD pipeline environment',
  },
};

// ============================================================================
// Environment Manager
// ============================================================================

export class EnvironmentManager {
  private logger: Logger;
  private environments: Map<EnvironmentName, EnvironmentConfig>;
  private currentEnvironment?: EnvironmentConfig;
  private configFilePath?: string;

  constructor(logger?: Logger) {
    this.logger = logger || new Logger({ context: 'EnvironmentManager' });
    this.environments = new Map();

    // Load default environments
    for (const [name, config] of Object.entries(DEFAULT_ENVIRONMENTS)) {
      this.environments.set(name, config);
    }
  }

  /**
   * Load environments from a configuration file
   */
  loadFromFile(filePath: string): void {
    this.configFilePath = filePath;

    if (!fs.existsSync(filePath)) {
      this.logger.warn(`Environment config file not found: ${filePath}`);
      return;
    }

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const config: EnvironmentFile = JSON.parse(content);

      for (const [name, env] of Object.entries(config.environments)) {
        this.environments.set(name, env);
      }

      this.logger.info(`Loaded ${Object.keys(config.environments).length} environments from ${filePath}`);
    } catch (error) {
      this.logger.error(`Failed to load environment config: ${(error as Error).message}`);
    }
  }

  /**
   * Save environments to a configuration file
   */
  saveToFile(filePath?: string): void {
    const targetPath = filePath || this.configFilePath || './test-environments.json';

    const config: EnvironmentFile = {
      version: '1.0',
      defaultEnvironment: 'development',
      environments: Object.fromEntries(this.environments),
    };

    fs.writeFileSync(targetPath, JSON.stringify(config, null, 2));
    this.logger.success(`Saved environments to ${targetPath}`);
  }

  /**
   * Get an environment by name
   */
  getEnvironment(name: EnvironmentName): EnvironmentConfig | undefined {
    return this.environments.get(name);
  }

  /**
   * Set the current environment
   */
  setEnvironment(name: EnvironmentName): EnvironmentConfig {
    const env = this.environments.get(name);

    if (!env) {
      throw new Error(`Environment not found: ${name}`);
    }

    this.currentEnvironment = env;

    // Set environment variables
    if (env.envVars) {
      for (const [key, value] of Object.entries(env.envVars)) {
        process.env[key] = value;
      }
    }

    this.logger.info(`Switched to environment: ${name}`);
    if (env.notes) {
      this.logger.info(`  Note: ${env.notes}`);
    }

    return env;
  }

  /**
   * Get current environment
   */
  getCurrentEnvironment(): EnvironmentConfig | undefined {
    return this.currentEnvironment;
  }

  /**
   * Add or update an environment
   */
  addEnvironment(config: EnvironmentConfig): void {
    this.environments.set(config.name, config);
    this.logger.info(`Added environment: ${config.name}`);
  }

  /**
   * Remove an environment
   */
  removeEnvironment(name: EnvironmentName): boolean {
    const deleted = this.environments.delete(name);
    if (deleted) {
      this.logger.info(`Removed environment: ${name}`);
    }
    return deleted;
  }

  /**
   * List all available environments
   */
  listEnvironments(): EnvironmentConfig[] {
    return Array.from(this.environments.values());
  }

  /**
   * Build TestConfig from environment
   */
  buildTestConfig(envName: EnvironmentName, overrides: Partial<TestConfig> = {}): TestConfig {
    const env = this.environments.get(envName);

    if (!env) {
      throw new Error(`Environment not found: ${envName}`);
    }

    // Build base config from environment
    const envConfig: Partial<TestConfig> = {
      baseUrl: env.baseUrl,
      auth: env.auth,
      ...env.testSettings,
    };

    // Apply timeout multiplier
    if (env.timeoutMultiplier && envConfig.timeout) {
      envConfig.timeout = envConfig.timeout * env.timeoutMultiplier;
    }

    // Merge exclude patterns
    if (env.excludePatterns) {
      envConfig.excludePatterns = [
        ...(envConfig.excludePatterns || []),
        ...env.excludePatterns,
      ];
    }

    // Merge with overrides
    return mergeConfig({
      ...envConfig,
      ...overrides,
    });
  }

  /**
   * Detect environment from URL
   */
  detectEnvironment(url: string): EnvironmentConfig | undefined {
    for (const env of this.environments.values()) {
      if (url.startsWith(env.baseUrl)) {
        return env;
      }
    }
    return undefined;
  }

  /**
   * Validate environment is accessible
   */
  async validateEnvironment(name: EnvironmentName): Promise<{
    valid: boolean;
    message: string;
    responseTime?: number;
  }> {
    const env = this.environments.get(name);

    if (!env) {
      return { valid: false, message: `Environment not found: ${name}` };
    }

    try {
      const startTime = Date.now();
      const response = await fetch(env.baseUrl, {
        method: 'HEAD',
        headers: env.headers,
      });
      const responseTime = Date.now() - startTime;

      if (response.ok) {
        return {
          valid: true,
          message: `Environment ${name} is accessible`,
          responseTime,
        };
      } else {
        return {
          valid: false,
          message: `Environment ${name} returned status ${response.status}`,
          responseTime,
        };
      }
    } catch (error) {
      return {
        valid: false,
        message: `Cannot reach ${name}: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Create environment from URL
   */
  createFromUrl(name: EnvironmentName, url: string): EnvironmentConfig {
    const config: EnvironmentConfig = {
      name,
      baseUrl: url,
      testSettings: {},
    };

    // Detect environment type from URL
    if (url.includes('localhost') || url.includes('127.0.0.1')) {
      config.testSettings = {
        headless: false,
        maxPages: 20,
      };
      config.timeoutMultiplier = 1;
    } else if (url.includes('staging') || url.includes('test') || url.includes('dev')) {
      config.testSettings = {
        headless: true,
        maxPages: 50,
      };
      config.timeoutMultiplier = 1.5;
    } else {
      // Assume production
      config.testSettings = {
        headless: true,
        depth: 'shallow',
        maxPages: 30,
      };
      config.timeoutMultiplier = 2;
      config.skipTests = ['form-submission'];
    }

    this.addEnvironment(config);
    return config;
  }

  /**
   * Get environment summary
   */
  getSummary(): string {
    const envs = this.listEnvironments();
    const lines = ['Available Environments:', ''];

    for (const env of envs) {
      const current = env === this.currentEnvironment ? ' (current)' : '';
      lines.push(`  ${env.name}${current}`);
      lines.push(`    URL: ${env.baseUrl}`);
      if (env.notes) {
        lines.push(`    Notes: ${env.notes}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create an environment manager with optional config file
 */
export function createEnvironmentManager(configPath?: string): EnvironmentManager {
  const manager = new EnvironmentManager();

  if (configPath) {
    manager.loadFromFile(configPath);
  }

  return manager;
}

// ============================================================================
// Export
// ============================================================================

export default EnvironmentManager;

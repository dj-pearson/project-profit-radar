/**
 * Automated Testing Tool - Test Fixtures
 *
 * Manages test data setup, seeding, and cleanup for consistent test states.
 * Works with Supabase for database operations.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { TestConfig } from '../types';
import { Logger } from '../utils/logger';
import { generateId, ensureDir } from '../utils/helpers';

// ============================================================================
// Types
// ============================================================================

export interface Fixture {
  /** Fixture name/identifier */
  name: string;
  /** Table name in database */
  table: string;
  /** Fixture data (array of records) */
  data: Record<string, unknown>[];
  /** Dependencies (other fixtures that must be loaded first) */
  dependencies?: string[];
  /** Cleanup strategy */
  cleanup?: 'delete' | 'truncate' | 'none';
  /** Whether fixture is enabled */
  enabled?: boolean;
}

export interface FixtureSet {
  /** Name of the fixture set */
  name: string;
  /** Description */
  description?: string;
  /** Fixtures in this set */
  fixtures: Fixture[];
  /** Global setup function */
  setup?: () => Promise<void>;
  /** Global teardown function */
  teardown?: () => Promise<void>;
}

export interface FixtureContext {
  /** Created record IDs by fixture name */
  createdIds: Map<string, string[]>;
  /** Fixture data cache */
  dataCache: Map<string, Record<string, unknown>[]>;
  /** Supabase client instance */
  supabaseClient?: unknown;
}

// ============================================================================
// Default Test Data
// ============================================================================

export const DEFAULT_TEST_USER = {
  email: 'test@example.com',
  password: 'TestPassword123!',
  name: 'Test User',
};

export const DEFAULT_TEST_COMPANY = {
  name: 'Test Construction Co.',
  industry: 'construction',
  size: 'small',
};

export const DEFAULT_TEST_PROJECT = {
  name: 'Test Project',
  status: 'active',
  budget: 100000,
};

// ============================================================================
// Fixture Manager
// ============================================================================

export class FixtureManager {
  private logger: Logger;
  private config: TestConfig;
  private fixtures: Map<string, Fixture> = new Map();
  private fixtureSets: Map<string, FixtureSet> = new Map();
  private context: FixtureContext;
  private fixturesDir: string;

  constructor(config: TestConfig, logger?: Logger) {
    this.config = config;
    this.logger = logger || new Logger({ context: 'FixtureManager' });
    this.fixturesDir = path.join(config.outputDir, 'fixtures');
    this.context = {
      createdIds: new Map(),
      dataCache: new Map(),
    };

    ensureDir(this.fixturesDir);
  }

  /**
   * Set Supabase client for database operations
   */
  setSupabaseClient(client: unknown): void {
    this.context.supabaseClient = client;
  }

  /**
   * Register a fixture
   */
  registerFixture(fixture: Fixture): void {
    this.fixtures.set(fixture.name, fixture);
    this.logger.debug(`Registered fixture: ${fixture.name}`);
  }

  /**
   * Register a fixture set
   */
  registerFixtureSet(set: FixtureSet): void {
    this.fixtureSets.set(set.name, set);
    for (const fixture of set.fixtures) {
      this.registerFixture(fixture);
    }
    this.logger.debug(`Registered fixture set: ${set.name} with ${set.fixtures.length} fixtures`);
  }

  /**
   * Load a fixture (insert data into database)
   */
  async loadFixture(name: string): Promise<void> {
    const fixture = this.fixtures.get(name);

    if (!fixture) {
      throw new Error(`Fixture not found: ${name}`);
    }

    if (fixture.enabled === false) {
      this.logger.debug(`Skipping disabled fixture: ${name}`);
      return;
    }

    // Load dependencies first
    if (fixture.dependencies) {
      for (const dep of fixture.dependencies) {
        if (!this.context.createdIds.has(dep)) {
          await this.loadFixture(dep);
        }
      }
    }

    this.logger.info(`Loading fixture: ${name}`);

    try {
      const createdIds: string[] = [];

      if (this.context.supabaseClient) {
        // Insert into database via Supabase
        const supabase = this.context.supabaseClient as {
          from: (table: string) => {
            insert: (data: unknown[]) => { select: () => Promise<{ data: { id: string }[] | null; error: Error | null }> };
          };
        };

        const { data, error } = await supabase
          .from(fixture.table)
          .insert(fixture.data)
          .select();

        if (error) {
          throw error;
        }

        if (data) {
          for (const record of data) {
            if (record.id) {
              createdIds.push(record.id);
            }
          }
        }
      } else {
        // Mock mode - just generate IDs
        for (const record of fixture.data) {
          createdIds.push((record.id as string) || generateId());
        }
      }

      this.context.createdIds.set(name, createdIds);
      this.context.dataCache.set(name, fixture.data);

      this.logger.success(`Loaded ${fixture.data.length} records for ${name}`);
    } catch (error) {
      this.logger.error(`Failed to load fixture ${name}: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Load all fixtures in a set
   */
  async loadFixtureSet(setName: string): Promise<void> {
    const set = this.fixtureSets.get(setName);

    if (!set) {
      throw new Error(`Fixture set not found: ${setName}`);
    }

    this.logger.info(`Loading fixture set: ${setName}`);

    // Run global setup
    if (set.setup) {
      await set.setup();
    }

    // Load fixtures in order (respecting dependencies)
    for (const fixture of set.fixtures) {
      await this.loadFixture(fixture.name);
    }

    this.logger.success(`Loaded fixture set: ${setName}`);
  }

  /**
   * Unload a fixture (remove data from database)
   */
  async unloadFixture(name: string): Promise<void> {
    const fixture = this.fixtures.get(name);

    if (!fixture) {
      return;
    }

    if (fixture.cleanup === 'none') {
      return;
    }

    const createdIds = this.context.createdIds.get(name);

    if (!createdIds || createdIds.length === 0) {
      return;
    }

    this.logger.info(`Unloading fixture: ${name}`);

    try {
      if (this.context.supabaseClient) {
        const supabase = this.context.supabaseClient as {
          from: (table: string) => {
            delete: () => { in: (column: string, values: string[]) => Promise<{ error: Error | null }> };
          };
        };

        if (fixture.cleanup === 'truncate') {
          // Delete all records
          await supabase
            .from(fixture.table)
            .delete()
            .in('id', createdIds);
        } else {
          // Delete specific records
          await supabase
            .from(fixture.table)
            .delete()
            .in('id', createdIds);
        }
      }

      this.context.createdIds.delete(name);
      this.context.dataCache.delete(name);

      this.logger.success(`Unloaded ${createdIds.length} records for ${name}`);
    } catch (error) {
      this.logger.warn(`Failed to unload fixture ${name}: ${(error as Error).message}`);
    }
  }

  /**
   * Unload all fixtures in a set
   */
  async unloadFixtureSet(setName: string): Promise<void> {
    const set = this.fixtureSets.get(setName);

    if (!set) {
      return;
    }

    // Unload in reverse order
    for (const fixture of [...set.fixtures].reverse()) {
      await this.unloadFixture(fixture.name);
    }

    // Run global teardown
    if (set.teardown) {
      await set.teardown();
    }

    this.logger.success(`Unloaded fixture set: ${setName}`);
  }

  /**
   * Cleanup all loaded fixtures
   */
  async cleanupAll(): Promise<void> {
    this.logger.info('Cleaning up all fixtures...');

    for (const name of this.context.createdIds.keys()) {
      await this.unloadFixture(name);
    }

    this.logger.success('All fixtures cleaned up');
  }

  /**
   * Get created IDs for a fixture
   */
  getCreatedIds(name: string): string[] {
    return this.context.createdIds.get(name) || [];
  }

  /**
   * Get fixture data from cache
   */
  getFixtureData(name: string): Record<string, unknown>[] {
    return this.context.dataCache.get(name) || [];
  }

  /**
   * Save fixtures to JSON file
   */
  saveToFile(filename: string): void {
    const data = {
      fixtures: Object.fromEntries(this.fixtures),
      sets: Object.fromEntries(
        Array.from(this.fixtureSets.entries()).map(([name, set]) => [
          name,
          { ...set, setup: undefined, teardown: undefined },
        ])
      ),
    };

    const filePath = path.join(this.fixturesDir, filename);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    this.logger.info(`Saved fixtures to ${filePath}`);
  }

  /**
   * Load fixtures from JSON file
   */
  loadFromFile(filename: string): void {
    const filePath = path.join(this.fixturesDir, filename);

    if (!fs.existsSync(filePath)) {
      this.logger.warn(`Fixtures file not found: ${filePath}`);
      return;
    }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    for (const fixture of Object.values(data.fixtures)) {
      this.registerFixture(fixture as Fixture);
    }

    for (const [name, set] of Object.entries(data.sets)) {
      const setData = set as FixtureSet;
      this.fixtureSets.set(name, setData);
    }

    this.logger.info(`Loaded fixtures from ${filePath}`);
  }

  /**
   * Generate fixture data for common entities
   */
  static generateTestData(type: 'user' | 'company' | 'project', count: number = 1): Record<string, unknown>[] {
    const data: Record<string, unknown>[] = [];

    for (let i = 0; i < count; i++) {
      switch (type) {
        case 'user':
          data.push({
            id: generateId(),
            email: `testuser${i + 1}@example.com`,
            name: `Test User ${i + 1}`,
            role: 'user',
            created_at: new Date().toISOString(),
          });
          break;

        case 'company':
          data.push({
            id: generateId(),
            name: `Test Company ${i + 1}`,
            industry: 'construction',
            size: 'small',
            created_at: new Date().toISOString(),
          });
          break;

        case 'project':
          data.push({
            id: generateId(),
            name: `Test Project ${i + 1}`,
            status: 'active',
            budget: Math.floor(Math.random() * 500000) + 50000,
            start_date: new Date().toISOString().split('T')[0],
            created_at: new Date().toISOString(),
          });
          break;
      }
    }

    return data;
  }
}

// ============================================================================
// Common Fixture Sets
// ============================================================================

export const SMOKE_TEST_FIXTURES: FixtureSet = {
  name: 'smoke',
  description: 'Minimal fixtures for smoke testing',
  fixtures: [
    {
      name: 'test-user',
      table: 'user_profiles',
      data: [DEFAULT_TEST_USER],
      cleanup: 'delete',
    },
  ],
};

export const FULL_TEST_FIXTURES: FixtureSet = {
  name: 'full',
  description: 'Complete fixtures for full testing',
  fixtures: [
    {
      name: 'test-company',
      table: 'companies',
      data: [DEFAULT_TEST_COMPANY],
      cleanup: 'delete',
    },
    {
      name: 'test-users',
      table: 'user_profiles',
      data: FixtureManager.generateTestData('user', 5),
      dependencies: ['test-company'],
      cleanup: 'delete',
    },
    {
      name: 'test-projects',
      table: 'projects',
      data: FixtureManager.generateTestData('project', 3),
      dependencies: ['test-company'],
      cleanup: 'delete',
    },
  ],
};

// ============================================================================
// Export
// ============================================================================

export default FixtureManager;

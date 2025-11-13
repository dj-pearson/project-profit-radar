/**
 * Intelligent Caching Layer
 * Supports Redis (production) and in-memory (development) caching
 * Optimizes database queries and API calls
 */

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  tags?: string[]; // Cache tags for invalidation
  namespace?: string; // Cache namespace/prefix
}

export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  hitRate: number;
}

/**
 * Cache Layer Interface
 */
export interface ICacheLayer {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, options?: CacheOptions): Promise<void>;
  delete(key: string): Promise<void>;
  deleteByTag(tag: string): Promise<number>;
  clear(namespace?: string): Promise<void>;
  has(key: string): Promise<boolean>;
  getStats(): CacheStats;
}

/**
 * In-Memory Cache Implementation
 * Used in development or as fallback
 */
class InMemoryCache implements ICacheLayer {
  private cache: Map<string, { value: any; expires: number; tags: string[] }> = new Map();
  private stats: CacheStats = { hits: 0, misses: 0, sets: 0, deletes: 0, hitRate: 0 };

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    // Check if expired
    if (entry.expires > 0 && Date.now() > entry.expires) {
      this.cache.delete(key);
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    this.stats.hits++;
    this.updateHitRate();
    return entry.value as T;
  }

  async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<void> {
    const ttl = options.ttl || 300; // Default 5 minutes
    const expires = ttl > 0 ? Date.now() + ttl * 1000 : 0;

    this.cache.set(key, {
      value,
      expires,
      tags: options.tags || [],
    });

    this.stats.sets++;
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
    this.stats.deletes++;
  }

  async deleteByTag(tag: string): Promise<number> {
    let deleted = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (entry.tags.includes(tag)) {
        this.cache.delete(key);
        deleted++;
      }
    }
    this.stats.deletes += deleted;
    return deleted;
  }

  async clear(namespace?: string): Promise<void> {
    if (namespace) {
      for (const key of this.cache.keys()) {
        if (key.startsWith(namespace + ':')) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
      this.stats = { hits: 0, misses: 0, sets: 0, deletes: 0, hitRate: 0 };
    }
  }

  async has(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    if (!entry) return false;

    // Check if expired
    if (entry.expires > 0 && Date.now() > entry.expires) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  getStats(): CacheStats {
    return { ...this.stats };
  }

  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }

  // Cleanup expired entries periodically
  startCleanup(intervalMs: number = 60000): void {
    setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.cache.entries()) {
        if (entry.expires > 0 && now > entry.expires) {
          this.cache.delete(key);
        }
      }
    }, intervalMs);
  }
}

/**
 * Smart Cache Manager
 * Automatically handles caching with intelligent invalidation
 */
class CacheManager {
  private cache: ICacheLayer;
  private defaultTTL: number = 300; // 5 minutes
  private namespace: string = 'builddesk';

  constructor() {
    // Initialize in-memory cache
    // In production, this would be replaced with Redis
    this.cache = new InMemoryCache();

    // Start cleanup for in-memory cache
    if (this.cache instanceof InMemoryCache) {
      this.cache.startCleanup();
    }
  }

  /**
   * Get value from cache or execute function and cache result
   */
  async remember<T>(
    key: string,
    fn: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const fullKey = this.buildKey(key, options.namespace);

    // Try to get from cache
    const cached = await this.cache.get<T>(fullKey);
    if (cached !== null) {
      return cached;
    }

    // Execute function and cache result
    const value = await fn();
    await this.cache.set(fullKey, value, {
      ttl: options.ttl || this.defaultTTL,
      tags: options.tags,
    });

    return value;
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string, namespace?: string): Promise<T | null> {
    const fullKey = this.buildKey(key, namespace);
    return await this.cache.get<T>(fullKey);
  }

  /**
   * Set value in cache
   */
  async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<void> {
    const fullKey = this.buildKey(key, options.namespace);
    await this.cache.set(fullKey, value, {
      ttl: options.ttl || this.defaultTTL,
      tags: options.tags,
    });
  }

  /**
   * Delete value from cache
   */
  async delete(key: string, namespace?: string): Promise<void> {
    const fullKey = this.buildKey(key, namespace);
    await this.cache.delete(fullKey);
  }

  /**
   * Invalidate all cache entries with a specific tag
   */
  async invalidateTag(tag: string): Promise<number> {
    return await this.cache.deleteByTag(tag);
  }

  /**
   * Clear all cache or specific namespace
   */
  async clear(namespace?: string): Promise<void> {
    await this.cache.clear(namespace || this.namespace);
  }

  /**
   * Check if key exists in cache
   */
  async has(key: string, namespace?: string): Promise<boolean> {
    const fullKey = this.buildKey(key, namespace);
    return await this.cache.has(fullKey);
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return this.cache.getStats();
  }

  /**
   * Build full cache key with namespace
   */
  private buildKey(key: string, namespace?: string): string {
    return `${namespace || this.namespace}:${key}`;
  }

  /**
   * Generate cache key from object
   */
  generateKey(prefix: string, params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}:${JSON.stringify(params[key])}`)
      .join('|');

    return `${prefix}:${sortedParams}`;
  }
}

/**
 * Cache decorators and utilities
 */

/**
 * Decorator for caching function results
 */
export function Cacheable(options: CacheOptions = {}) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const cacheKey = `${propertyKey}:${JSON.stringify(args)}`;
      return await cache.remember(
        cacheKey,
        () => originalMethod.apply(this, args),
        options
      );
    };

    return descriptor;
  };
}

/**
 * Smart query caching patterns
 */
export const QueryCache = {
  /**
   * Cache project data
   */
  project: (projectId: string) => ({
    key: `project:${projectId}`,
    tags: ['projects', `project:${projectId}`],
    ttl: 300, // 5 minutes
  }),

  /**
   * Cache project list
   */
  projectList: (filters: Record<string, any>) => ({
    key: cache.generateKey('project:list', filters),
    tags: ['projects', 'project:list'],
    ttl: 180, // 3 minutes
  }),

  /**
   * Cache user data
   */
  user: (userId: string) => ({
    key: `user:${userId}`,
    tags: ['users', `user:${userId}`],
    ttl: 600, // 10 minutes
  }),

  /**
   * Cache financial data
   */
  financial: (type: string, id: string) => ({
    key: `financial:${type}:${id}`,
    tags: ['financial', `financial:${type}`],
    ttl: 120, // 2 minutes
  }),

  /**
   * Cache reports
   */
  report: (reportType: string, params: Record<string, any>) => ({
    key: cache.generateKey(`report:${reportType}`, params),
    tags: ['reports', `report:${reportType}`],
    ttl: 900, // 15 minutes
  }),

  /**
   * Cache dashboard data
   */
  dashboard: (userId: string) => ({
    key: `dashboard:${userId}`,
    tags: ['dashboard', `user:${userId}`],
    ttl: 120, // 2 minutes
  }),
};

/**
 * Cache invalidation helpers
 */
export const CacheInvalidation = {
  /**
   * Invalidate project-related caches
   */
  async project(projectId: string) {
    await cache.invalidateTag(`project:${projectId}`);
    await cache.invalidateTag('project:list');
  },

  /**
   * Invalidate user-related caches
   */
  async user(userId: string) {
    await cache.invalidateTag(`user:${userId}`);
  },

  /**
   * Invalidate financial caches
   */
  async financial(type?: string) {
    if (type) {
      await cache.invalidateTag(`financial:${type}`);
    } else {
      await cache.invalidateTag('financial');
    }
  },

  /**
   * Invalidate all report caches
   */
  async reports() {
    await cache.invalidateTag('reports');
  },

  /**
   * Invalidate dashboard caches
   */
  async dashboard(userId?: string) {
    if (userId) {
      await cache.invalidateTag(`user:${userId}`);
    }
    await cache.invalidateTag('dashboard');
  },
};

// Export singleton instance
export const cache = new CacheManager();

/**
 * Usage examples:
 *
 * // Simple caching
 * const data = await cache.remember(
 *   'expensive-query',
 *   async () => await fetchExpensiveData(),
 *   { ttl: 600, tags: ['data'] }
 * );
 *
 * // With query patterns
 * const project = await cache.remember(
 *   QueryCache.project(projectId).key,
 *   async () => await fetchProject(projectId),
 *   QueryCache.project(projectId)
 * );
 *
 * // Invalidation
 * await CacheInvalidation.project(projectId);
 *
 * // Stats
 * const stats = cache.getStats();
 * console.log(`Hit rate: ${(stats.hitRate * 100).toFixed(2)}%`);
 */

/**
 * Production-safe logging service
 * Replaces direct console.log statements with environment-aware logging
 *
 * Usage:
 *   import { logger } from '@/lib/logger';
 *   logger.debug('Debug info');
 *   logger.info('Info message');
 *   logger.warn('Warning message');
 *   logger.error('Error message', error);
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerConfig {
  enabled: boolean;
  level: LogLevel;
  prefix?: string;
}

class Logger {
  private config: LoggerConfig;
  private errorTrackingEnabled: boolean = false;

  constructor(config?: Partial<LoggerConfig>) {
    this.config = {
      enabled: import.meta.env.DEV,
      level: import.meta.env.DEV ? 'debug' : 'error',
      prefix: '[BuildDesk]',
      ...config,
    };
    // Enable error tracking in production
    if (import.meta.env.PROD) {
      this.enableErrorTracking();
    }
  }

  /**
   * Configure the logger
   */
  configure(config: Partial<LoggerConfig>) {
    this.config = { ...this.config, ...config };
  }

  /**
   * Enable error tracking service integration (e.g., Sentry)
   */
  enableErrorTracking() {
    this.errorTrackingEnabled = true;
  }

  /**
   * Check if a log level should be output
   */
  private shouldLog(level: LogLevel): boolean {
    if (!this.config.enabled && level !== 'error') {
      return false;
    }

    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.config.level);
    const requestedLevelIndex = levels.indexOf(level);

    return requestedLevelIndex >= currentLevelIndex;
  }

  /**
   * Format log message with prefix
   */
  private formatMessage(message: string, level: LogLevel): string {
    const timestamp = new Date().toISOString();
    const prefix = this.config.prefix ? `${this.config.prefix} ` : '';
    return `${prefix}[${level.toUpperCase()}] ${timestamp}: ${message}`;
  }

  /**
   * Send error to tracking service
   */
  private trackError(error: Error | string, context?: Record<string, any>) {
    if (!this.errorTrackingEnabled) return;

    // Integrate with Sentry error tracking
    try {
      // Dynamic import to avoid issues if Sentry is not available
      import('@sentry/react').then((Sentry) => {
        if (error instanceof Error) {
          Sentry.captureException(error, {
            extra: context,
            level: 'error',
          });
        } else {
          Sentry.captureMessage(String(error), {
            extra: context,
            level: 'error',
          });
        }
      }).catch(() => {
        // Sentry not available, silently ignore
      });
    } catch (e) {
      // Fail silently if Sentry is not available
    }
  }

  /**
   * Debug level logging - only in development
   */
  debug(message: string, ...args: any[]) {
    if (this.shouldLog('debug')) {
    }
  }

  /**
   * Info level logging - general information
   */
  info(message: string, ...args: any[]) {
    if (this.shouldLog('info')) {
    }
  }

  /**
   * Warning level logging
   */
  warn(message: string, ...args: any[]) {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage(message, 'warn'), ...args);
    }
  }

  /**
   * Error level logging - always logged and sent to tracking service
   */
  error(message: string, error?: Error | any, context?: Record<string, any>) {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage(message, 'error'), error, context);
    }

    // Always track errors in production
    if (import.meta.env.PROD && error) {
      this.trackError(error, context);
    }
  }

  /**
   * Group logging - useful for related logs
   */
  group(label: string, callback: () => void) {
    if (this.shouldLog('debug')) {
      console.group(label);
      callback();
      console.groupEnd();
    } else {
      callback();
    }
  }

  /**
   * Table logging - useful for arrays/objects
   */
  table(data: any, columns?: string[]) {
    if (this.shouldLog('debug')) {
      console.table(data, columns);
    }
  }

  /**
   * Time logging - measure execution time
   */
  time(label: string) {
    if (this.shouldLog('debug')) {
      console.time(label);
    }
  }

  /**
   * End time logging
   */
  timeEnd(label: string) {
    if (this.shouldLog('debug')) {
      console.timeEnd(label);
    }
  }

  /**
   * Performance logging
   */
  performance(label: string, startTime: number) {
    const duration = performance.now() - startTime;
    if (this.shouldLog('debug')) {
      this.debug(`${label} took ${duration.toFixed(2)}ms`);
    }
  }
}

// Export singleton instance
export const logger = new Logger();

// Export convenience functions
export const log = {
  debug: logger.debug.bind(logger),
  info: logger.info.bind(logger),
  warn: logger.warn.bind(logger),
  error: logger.error.bind(logger),
  group: logger.group.bind(logger),
  table: logger.table.bind(logger),
  time: logger.time.bind(logger),
  timeEnd: logger.timeEnd.bind(logger),
  performance: logger.performance.bind(logger),
};

export default logger;

/**
 * Automated Testing Tool - Logger
 *
 * Structured logging utility with color support and multiple output levels.
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// Types
// ============================================================================

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'success';

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  context?: string;
  data?: Record<string, unknown>;
}

export interface LoggerConfig {
  /** Minimum log level to output */
  minLevel: LogLevel;
  /** Enable color output */
  colors: boolean;
  /** Enable timestamps */
  timestamps: boolean;
  /** Log to file */
  logFile?: string;
  /** Context prefix */
  context?: string;
  /** Enable verbose output */
  verbose: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  success: 2,
  warn: 3,
  error: 4,
};

const COLORS: Record<LogLevel | 'reset' | 'dim' | 'bold', string> = {
  debug: '\x1b[36m',    // Cyan
  info: '\x1b[34m',     // Blue
  success: '\x1b[32m',  // Green
  warn: '\x1b[33m',     // Yellow
  error: '\x1b[31m',    // Red
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
};

const ICONS: Record<LogLevel, string> = {
  debug: '🔍',
  info: 'ℹ️',
  success: '✅',
  warn: '⚠️',
  error: '❌',
};

// ============================================================================
// Logger Class
// ============================================================================

export class Logger {
  private config: LoggerConfig;
  private entries: LogEntry[] = [];
  private fileStream?: fs.WriteStream;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      minLevel: 'info',
      colors: true,
      timestamps: true,
      verbose: false,
      ...config,
    };

    if (this.config.logFile) {
      this.initializeFileLogging();
    }
  }

  private initializeFileLogging(): void {
    if (!this.config.logFile) return;

    const logDir = path.dirname(this.config.logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    this.fileStream = fs.createWriteStream(this.config.logFile, { flags: 'a' });
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.config.minLevel];
  }

  private formatMessage(entry: LogEntry): string {
    const parts: string[] = [];

    // Timestamp
    if (this.config.timestamps) {
      const time = entry.timestamp.toISOString().split('T')[1].split('.')[0];
      if (this.config.colors) {
        parts.push(`${COLORS.dim}[${time}]${COLORS.reset}`);
      } else {
        parts.push(`[${time}]`);
      }
    }

    // Level
    const icon = ICONS[entry.level];
    if (this.config.colors) {
      parts.push(`${COLORS[entry.level]}${icon} ${entry.level.toUpperCase().padEnd(7)}${COLORS.reset}`);
    } else {
      parts.push(`${icon} ${entry.level.toUpperCase().padEnd(7)}`);
    }

    // Context
    if (entry.context || this.config.context) {
      const ctx = entry.context || this.config.context;
      if (this.config.colors) {
        parts.push(`${COLORS.dim}[${ctx}]${COLORS.reset}`);
      } else {
        parts.push(`[${ctx}]`);
      }
    }

    // Message
    if (this.config.colors && entry.level === 'error') {
      parts.push(`${COLORS.bold}${entry.message}${COLORS.reset}`);
    } else {
      parts.push(entry.message);
    }

    // Data
    if (entry.data && this.config.verbose) {
      const dataStr = JSON.stringify(entry.data, null, 2);
      if (this.config.colors) {
        parts.push(`\n${COLORS.dim}${dataStr}${COLORS.reset}`);
      } else {
        parts.push(`\n${dataStr}`);
      }
    }

    return parts.join(' ');
  }

  private log(level: LogLevel, message: string, context?: string, data?: Record<string, unknown>): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      context,
      data,
    };

    this.entries.push(entry);

    const formatted = this.formatMessage(entry);
    console.log(formatted);

    if (this.fileStream) {
      // Write to file without colors
      const plainEntry = {
        ...entry,
        timestamp: entry.timestamp.toISOString(),
      };
      this.fileStream.write(JSON.stringify(plainEntry) + '\n');
    }
  }

  debug(message: string, context?: string, data?: Record<string, unknown>): void {
    this.log('debug', message, context, data);
  }

  info(message: string, context?: string, data?: Record<string, unknown>): void {
    this.log('info', message, context, data);
  }

  success(message: string, context?: string, data?: Record<string, unknown>): void {
    this.log('success', message, context, data);
  }

  warn(message: string, context?: string, data?: Record<string, unknown>): void {
    this.log('warn', message, context, data);
  }

  error(message: string, context?: string, data?: Record<string, unknown>): void {
    this.log('error', message, context, data);
  }

  /**
   * Log a section header
   */
  section(title: string): void {
    const line = '═'.repeat(60);
    console.log('');
    if (this.config.colors) {
      console.log(`${COLORS.bold}${COLORS.info}${line}${COLORS.reset}`);
      console.log(`${COLORS.bold}${COLORS.info}  ${title}${COLORS.reset}`);
      console.log(`${COLORS.bold}${COLORS.info}${line}${COLORS.reset}`);
    } else {
      console.log(line);
      console.log(`  ${title}`);
      console.log(line);
    }
    console.log('');
  }

  /**
   * Log a subsection header
   */
  subsection(title: string): void {
    const line = '─'.repeat(40);
    console.log('');
    if (this.config.colors) {
      console.log(`${COLORS.dim}${line}${COLORS.reset}`);
      console.log(`${COLORS.bold}  ${title}${COLORS.reset}`);
      console.log(`${COLORS.dim}${line}${COLORS.reset}`);
    } else {
      console.log(line);
      console.log(`  ${title}`);
      console.log(line);
    }
  }

  /**
   * Log progress
   */
  progress(current: number, total: number, message: string): void {
    const percent = Math.round((current / total) * 100);
    const filled = Math.round(percent / 5);
    const empty = 20 - filled;
    const bar = '█'.repeat(filled) + '░'.repeat(empty);

    if (this.config.colors) {
      process.stdout.write(
        `\r${COLORS.info}[${bar}] ${percent}%${COLORS.reset} ${message}`
      );
    } else {
      process.stdout.write(`\r[${bar}] ${percent}% ${message}`);
    }

    if (current === total) {
      console.log('');
    }
  }

  /**
   * Log a table
   */
  table(headers: string[], rows: string[][]): void {
    const widths = headers.map((h, i) => {
      const maxRowWidth = Math.max(...rows.map((r) => (r[i] || '').length));
      return Math.max(h.length, maxRowWidth);
    });

    const formatRow = (cells: string[]): string => {
      return cells.map((c, i) => (c || '').padEnd(widths[i])).join(' │ ');
    };

    const separator = widths.map((w) => '─'.repeat(w)).join('─┼─');

    console.log('');
    if (this.config.colors) {
      console.log(`${COLORS.bold}${formatRow(headers)}${COLORS.reset}`);
    } else {
      console.log(formatRow(headers));
    }
    console.log(separator);
    rows.forEach((row) => console.log(formatRow(row)));
    console.log('');
  }

  /**
   * Log a summary box
   */
  summary(title: string, stats: Record<string, number | string>): void {
    const maxKeyLen = Math.max(...Object.keys(stats).map((k) => k.length));

    console.log('');
    if (this.config.colors) {
      console.log(`${COLORS.bold}╔${'═'.repeat(maxKeyLen + 20)}╗${COLORS.reset}`);
      console.log(`${COLORS.bold}║  ${title.padEnd(maxKeyLen + 17)}║${COLORS.reset}`);
      console.log(`${COLORS.bold}╠${'═'.repeat(maxKeyLen + 20)}╣${COLORS.reset}`);

      Object.entries(stats).forEach(([key, value]) => {
        const valueStr = String(value);
        const color =
          typeof value === 'number'
            ? value > 0
              ? COLORS.success
              : COLORS.dim
            : COLORS.reset;
        console.log(
          `${COLORS.bold}║  ${COLORS.reset}${key.padEnd(maxKeyLen)}: ${color}${valueStr.padStart(15)}${COLORS.reset}${COLORS.bold} ║${COLORS.reset}`
        );
      });

      console.log(`${COLORS.bold}╚${'═'.repeat(maxKeyLen + 20)}╝${COLORS.reset}`);
    } else {
      console.log(`╔${'═'.repeat(maxKeyLen + 20)}╗`);
      console.log(`║  ${title.padEnd(maxKeyLen + 17)}║`);
      console.log(`╠${'═'.repeat(maxKeyLen + 20)}╣`);

      Object.entries(stats).forEach(([key, value]) => {
        console.log(`║  ${key.padEnd(maxKeyLen)}: ${String(value).padStart(15)} ║`);
      });

      console.log(`╚${'═'.repeat(maxKeyLen + 20)}╝`);
    }
    console.log('');
  }

  /**
   * Get all log entries
   */
  getEntries(): LogEntry[] {
    return [...this.entries];
  }

  /**
   * Get entries by level
   */
  getEntriesByLevel(level: LogLevel): LogEntry[] {
    return this.entries.filter((e) => e.level === level);
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.entries = [];
  }

  /**
   * Close file stream
   */
  close(): void {
    if (this.fileStream) {
      this.fileStream.end();
    }
  }

  /**
   * Create a child logger with context
   */
  child(context: string): Logger {
    return new Logger({
      ...this.config,
      context: this.config.context ? `${this.config.context}:${context}` : context,
    });
  }
}

// ============================================================================
// Default Export
// ============================================================================

export const defaultLogger = new Logger({
  minLevel: 'info',
  colors: true,
  timestamps: true,
  verbose: false,
});

export default Logger;

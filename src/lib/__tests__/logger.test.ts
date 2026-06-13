import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logger } from '../logger';

/**
 * Tests for logger level output (US-209).
 * Previously logger.debug()/info() checked shouldLog() then did nothing, so
 * debug/info context was silently dropped even when enabled.
 */
describe('logger level output', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // Ensure debug-level output is enabled regardless of test env.
    logger.configure({ enabled: true, level: 'debug' });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('debug() actually writes to console.debug when enabled', () => {
    const spy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    logger.debug('hello debug', { a: 1 });
    expect(spy).toHaveBeenCalledOnce();
    expect(String(spy.mock.calls[0][0])).toContain('hello debug');
  });

  it('info() actually writes to console.info when enabled', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {});
    logger.info('hello info');
    expect(spy).toHaveBeenCalledOnce();
    expect(String(spy.mock.calls[0][0])).toContain('hello info');
  });

  it('debug() is suppressed when level is raised above debug', () => {
    logger.configure({ enabled: true, level: 'warn' });
    const spy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    logger.debug('should not log');
    expect(spy).not.toHaveBeenCalled();
  });
});

import { describe, it, expect } from 'vitest';
import { getLockoutMessage, type LoginAttemptResult } from '../loginProtection';

describe('Login Protection Helpers', () => {
  describe('getLockoutMessage()', () => {
    it('returns empty string when allowed with no message', () => {
      const result: LoginAttemptResult = {
        allowed: true,
        remainingAttempts: 5,
      };
      expect(getLockoutMessage(result)).toBe('');
    });

    it('returns the provided message when present', () => {
      const result: LoginAttemptResult = {
        allowed: true,
        remainingAttempts: 2,
        message: 'Warning: 2 login attempts remaining before account lockout.',
      };
      expect(getLockoutMessage(result)).toBe('Warning: 2 login attempts remaining before account lockout.');
    });

    it('returns lockout message for short lockout periods (minutes)', () => {
      const result: LoginAttemptResult = {
        allowed: false,
        remainingAttempts: 0,
        lockoutMinutes: 5,
        lockoutUntil: new Date(Date.now() + 5 * 60 * 1000),
        message: 'Account locked.',
      };
      expect(getLockoutMessage(result)).toBe('Account is locked. Please try again in 5 minutes.');
    });

    it('returns lockout message for 1 minute (singular)', () => {
      const result: LoginAttemptResult = {
        allowed: false,
        remainingAttempts: 0,
        lockoutMinutes: 1,
        lockoutUntil: new Date(Date.now() + 1 * 60 * 1000),
      };
      expect(getLockoutMessage(result)).toBe('Account is locked. Please try again in 1 minute.');
    });

    it('returns lockout message for 59 minutes (plural)', () => {
      const result: LoginAttemptResult = {
        allowed: false,
        remainingAttempts: 0,
        lockoutMinutes: 59,
        lockoutUntil: new Date(Date.now() + 59 * 60 * 1000),
      };
      expect(getLockoutMessage(result)).toBe('Account is locked. Please try again in 59 minutes.');
    });

    it('returns lockout message for exactly 60 minutes (1 hour)', () => {
      const result: LoginAttemptResult = {
        allowed: false,
        remainingAttempts: 0,
        lockoutMinutes: 60,
        lockoutUntil: new Date(Date.now() + 60 * 60 * 1000),
      };
      expect(getLockoutMessage(result)).toBe('Account is locked. Please try again in 1 hour.');
    });

    it('returns lockout message for hours with minutes', () => {
      const result: LoginAttemptResult = {
        allowed: false,
        remainingAttempts: 0,
        lockoutMinutes: 90,
        lockoutUntil: new Date(Date.now() + 90 * 60 * 1000),
      };
      expect(getLockoutMessage(result)).toBe('Account is locked. Please try again in 1 hour and 30 minutes.');
    });

    it('returns lockout message for multiple hours', () => {
      const result: LoginAttemptResult = {
        allowed: false,
        remainingAttempts: 0,
        lockoutMinutes: 120,
        lockoutUntil: new Date(Date.now() + 120 * 60 * 1000),
      };
      expect(getLockoutMessage(result)).toBe('Account is locked. Please try again in 2 hours.');
    });

    it('returns lockout message for multiple hours with 1 minute (singular)', () => {
      const result: LoginAttemptResult = {
        allowed: false,
        remainingAttempts: 0,
        lockoutMinutes: 121,
        lockoutUntil: new Date(Date.now() + 121 * 60 * 1000),
      };
      expect(getLockoutMessage(result)).toBe('Account is locked. Please try again in 2 hours and 1 minute.');
    });

    it('returns empty string when not allowed but no lockoutMinutes', () => {
      const result: LoginAttemptResult = {
        allowed: false,
        remainingAttempts: 0,
      };
      expect(getLockoutMessage(result)).toBe('');
    });

    it('returns empty string when lockoutMinutes is 0', () => {
      const result: LoginAttemptResult = {
        allowed: false,
        remainingAttempts: 0,
        lockoutMinutes: 0,
      };
      expect(getLockoutMessage(result)).toBe('');
    });

    it('handles warning message for remaining attempts', () => {
      const result: LoginAttemptResult = {
        allowed: true,
        remainingAttempts: 1,
        message: 'Warning: 1 login attempt remaining before account lockout.',
      };
      expect(getLockoutMessage(result)).toBe('Warning: 1 login attempt remaining before account lockout.');
    });
  });
});

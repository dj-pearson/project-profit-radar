/**
 * Centralized validation schemas for the application
 * 
 * All user input validation should use these Zod schemas to ensure:
 * - Type safety
 * - Consistent validation rules
 * - Protection against injection attacks
 * - Clear error messages
 */

export * from './common';
export * from './time-tracking';
export * from './expenses';
export * from './projects';
export * from './users';

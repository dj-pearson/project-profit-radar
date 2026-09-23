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
export * from './daily-reports';
export * from './auth';
export * from './leads';
export * from './accounting';
export * from './promotions';
export * from './funnels';
export * from './documents';
export * from './bonds';
export * from './permits';
export * from './warranty';
export * from './crm';
export * from './equipment';
export * from './tasks';
export * from './invoices';

/**
 * Shared validation utilities for edge functions
 * SECURITY: All edge functions MUST validate input to prevent injection attacks
 */

import { z } from "npm:zod@3";

// Common validation schemas
export const uuidSchema = z.string().uuid('Invalid UUID format');
export const emailSchema = z.string().email('Invalid email format').max(255);
export const positiveIntSchema = z.number().int().positive();
export const nonEmptyStringSchema = z.string().min(1).max(1000);

// Request validation helper
export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: `Validation failed: ${error.errors.map(e => e.message).join(', ')}`
      };
    }
    return {
      success: false,
      error: 'Invalid request format'
    };
  }
}

// Sanitize error messages to prevent information disclosure
export function sanitizeError(error: unknown): string {
  // Never expose internal error details to clients
  if (error instanceof Error) {
    // Log full error server-side
    console.error('[Internal Error]', error.message, error.stack);
    
    // Return generic message to client
    return 'An error occurred processing your request';
  }
  
  return 'An unexpected error occurred';
}

// Create safe error response
export function createErrorResponse(
  statusCode: number,
  userMessage: string,
  corsHeaders: Record<string, string>
): Response {
  return new Response(
    JSON.stringify({
      error: userMessage,
      code: statusCode
    }),
    {
      status: statusCode,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
}
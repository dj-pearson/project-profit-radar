/**
 * Import Executor Service
 * Handles the actual database operations for importing data
 */

import { supabase } from '@/integrations/supabase/client';
import { CSV_TEMPLATES, CSVTemplate, CSVField } from './templates';
import { z } from 'zod';
import DOMPurify from 'dompurify';

export interface ImportResult {
  success: boolean;
  inserted: number;
  updated: number;
  skipped: number;
  errors: ImportError[];
}

export interface ImportError {
  rowIndex: number;
  field?: string;
  message: string;
  value?: any;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ImportError[];
  validatedData: Record<string, any>[];
}

/**
 * Validate import data against template schema
 */
export function validateImportData(
  dataType: string,
  data: Record<string, any>[],
  fieldMappings: Record<string, string>
): ValidationResult {
  const template = CSV_TEMPLATES[dataType];
  if (!template) {
    return {
      isValid: false,
      errors: [{ rowIndex: -1, message: `Unknown data type: ${dataType}` }],
      validatedData: [],
    };
  }

  const errors: ImportError[] = [];
  const validatedData: Record<string, any>[] = [];

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const validatedRow: Record<string, any> = {};
    let rowHasError = false;

    for (const field of template.fields) {
      // Skip lookup fields (prefixed with _)
      if (field.dbField.startsWith('_')) continue;

      // Get the mapped source field or use direct field name
      const sourceField = Object.entries(fieldMappings)
        .find(([, target]) => target === field.dbField)?.[0] || field.name;

      const value = row[sourceField] ?? row[field.dbField] ?? row[field.name];

      // Check required fields
      if (field.required && (value === undefined || value === null || value === '')) {
        errors.push({
          rowIndex: i,
          field: field.name,
          message: `${field.name} is required`,
        });
        rowHasError = true;
        continue;
      }

      // Skip empty optional fields
      if (value === undefined || value === null || value === '') {
        continue;
      }

      // Validate and transform based on type
      try {
        validatedRow[field.dbField] = validateAndTransformValue(value, field, i, errors);
      } catch (e) {
        rowHasError = true;
      }
    }

    if (!rowHasError) {
      validatedData.push(validatedRow);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    validatedData,
  };
}

/**
 * Validate and transform a single value based on field type
 */
function validateAndTransformValue(
  value: any,
  field: CSVField,
  rowIndex: number,
  errors: ImportError[]
): any {
  const stringValue = String(value).trim();

  switch (field.type) {
    case 'string':
      // Sanitize string input
      const sanitized = DOMPurify.sanitize(stringValue);
      if (sanitized.length > 2000) {
        errors.push({
          rowIndex,
          field: field.name,
          message: `${field.name} exceeds maximum length of 2000 characters`,
          value: stringValue.substring(0, 50) + '...',
        });
        throw new Error('Validation failed');
      }
      return sanitized;

    case 'number':
      const numValue = parseFloat(stringValue.replace(/[$,]/g, ''));
      if (isNaN(numValue)) {
        errors.push({
          rowIndex,
          field: field.name,
          message: `${field.name} must be a valid number`,
          value: stringValue,
        });
        throw new Error('Validation failed');
      }
      return numValue;

    case 'date':
      const dateValue = parseDate(stringValue);
      if (!dateValue) {
        errors.push({
          rowIndex,
          field: field.name,
          message: `${field.name} must be a valid date (YYYY-MM-DD format)`,
          value: stringValue,
        });
        throw new Error('Validation failed');
      }
      return dateValue;

    case 'boolean':
      const boolValue = parseBooleanValue(stringValue);
      return boolValue;

    case 'email':
      const emailSchema = z.string().email();
      const emailResult = emailSchema.safeParse(stringValue);
      if (!emailResult.success) {
        errors.push({
          rowIndex,
          field: field.name,
          message: `${field.name} must be a valid email address`,
          value: stringValue,
        });
        throw new Error('Validation failed');
      }
      return stringValue.toLowerCase();

    case 'phone':
      // Basic phone validation and formatting
      const phoneClean = stringValue.replace(/[^\d+]/g, '');
      if (phoneClean.length < 7 || phoneClean.length > 15) {
        errors.push({
          rowIndex,
          field: field.name,
          message: `${field.name} must be a valid phone number`,
          value: stringValue,
        });
        throw new Error('Validation failed');
      }
      return stringValue;

    default:
      return DOMPurify.sanitize(stringValue);
  }
}

/**
 * Parse various date formats to ISO string
 */
function parseDate(value: string): string | null {
  // Try ISO format first (YYYY-MM-DD)
  const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
  }

  // Try US format (MM/DD/YYYY)
  const usMatch = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (usMatch) {
    const date = new Date(`${usMatch[3]}-${usMatch[1].padStart(2, '0')}-${usMatch[2].padStart(2, '0')}`);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
  }

  // Try EU format (DD/MM/YYYY)
  const euMatch = value.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (euMatch) {
    const date = new Date(`${euMatch[3]}-${euMatch[2].padStart(2, '0')}-${euMatch[1].padStart(2, '0')}`);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
  }

  // Try natural language parsing as fallback
  const date = new Date(value);
  if (!isNaN(date.getTime())) {
    return date.toISOString();
  }

  return null;
}

/**
 * Parse boolean values from various string representations
 */
function parseBooleanValue(value: string): boolean {
  const lowered = value.toLowerCase();
  return ['true', 'yes', '1', 'y', 'on', 'enabled'].includes(lowered);
}

/**
 * Execute the import operation
 */
export async function executeImport(
  dataType: string,
  toInsert: Record<string, any>[],
  toUpdate: Array<{ id: string; data: Record<string, any> }>,
  companyId: string,
  userId: string
): Promise<ImportResult> {
  const template = CSV_TEMPLATES[dataType];
  if (!template) {
    return {
      success: false,
      inserted: 0,
      updated: 0,
      skipped: 0,
      errors: [{ rowIndex: -1, message: `Unknown data type: ${dataType}` }],
    };
  }

  const errors: ImportError[] = [];
  let inserted = 0;
  let updated = 0;

  // Prepare insert records with company_id and created_by
  const insertRecords = toInsert.map(record => ({
    ...record,
    company_id: companyId,
    created_by: userId,
  }));

  // Batch insert (100 records at a time)
  const batchSize = 100;
  for (let i = 0; i < insertRecords.length; i += batchSize) {
    const batch = insertRecords.slice(i, i + batchSize);

    try {
      const { data, error } = await supabase
        .from(template.tableName)
        .insert(batch)
        .select('id');

      if (error) {
        errors.push({
          rowIndex: i,
          message: `Batch insert failed: ${error.message}`,
        });
      } else {
        inserted += data?.length || 0;
      }
    } catch (e) {
      errors.push({
        rowIndex: i,
        message: `Batch insert error: ${e instanceof Error ? e.message : 'Unknown error'}`,
      });
    }
  }

  // Process updates one at a time to preserve error context
  for (const { id, data } of toUpdate) {
    try {
      // Remove system fields before update
      const updateData = { ...data };
      delete updateData.id;
      delete updateData.created_at;
      delete updateData.company_id;
      delete updateData.created_by;

      const { error } = await supabase
        .from(template.tableName)
        .update(updateData)
        .eq('id', id)
        .eq('company_id', companyId);

      if (error) {
        errors.push({
          rowIndex: -1,
          message: `Update failed for ID ${id}: ${error.message}`,
        });
      } else {
        updated++;
      }
    } catch (e) {
      errors.push({
        rowIndex: -1,
        message: `Update error for ID ${id}: ${e instanceof Error ? e.message : 'Unknown error'}`,
      });
    }
  }

  return {
    success: errors.length === 0,
    inserted,
    updated,
    skipped: 0,
    errors,
  };
}

/**
 * Resolve lookup fields (like project_name to project_id)
 */
export async function resolveLookupFields(
  dataType: string,
  data: Record<string, any>[],
  companyId: string
): Promise<Record<string, any>[]> {
  const template = CSV_TEMPLATES[dataType];
  if (!template) return data;

  // Find lookup fields (prefixed with _)
  const lookupFields = template.fields.filter(f => f.dbField.startsWith('_'));

  if (lookupFields.length === 0) return data;

  // Build lookup caches
  const caches: Record<string, Map<string, string>> = {};

  for (const field of lookupFields) {
    if (field.dbField === '_project_name') {
      const { data: projects } = await supabase
        .from('projects')
        .select('id, name')
        .eq('company_id', companyId);

      const cache = new Map<string, string>();
      projects?.forEach(p => {
        cache.set(p.name.toLowerCase(), p.id);
      });
      caches['_project_name'] = cache;
    }

    if (field.dbField === '_worker_email') {
      const { data: users } = await supabase
        .from('user_profiles')
        .select('id, email')
        .eq('company_id', companyId);

      const cache = new Map<string, string>();
      users?.forEach(u => {
        if (u.email) cache.set(u.email.toLowerCase(), u.id);
      });
      caches['_worker_email'] = cache;
    }

    if (field.dbField === '_category_name') {
      const { data: categories } = await supabase
        .from('expense_categories')
        .select('id, name')
        .eq('company_id', companyId);

      const cache = new Map<string, string>();
      categories?.forEach(c => {
        cache.set(c.name.toLowerCase(), c.id);
      });
      caches['_category_name'] = cache;
    }
  }

  // Resolve lookups in data
  return data.map(record => {
    const resolved = { ...record };

    for (const field of lookupFields) {
      const lookupValue = record[field.dbField] || record[field.name];
      if (!lookupValue) continue;

      const cache = caches[field.dbField];
      if (!cache) continue;

      const resolvedId = cache.get(lookupValue.toLowerCase());
      if (resolvedId) {
        // Map to the actual foreign key field
        if (field.dbField === '_project_name') {
          resolved.project_id = resolvedId;
        } else if (field.dbField === '_worker_email') {
          resolved.user_id = resolvedId;
        } else if (field.dbField === '_category_name') {
          resolved.category_id = resolvedId;
        }
      }

      // Remove the lookup field from the record
      delete resolved[field.dbField];
      delete resolved[field.name];
    }

    return resolved;
  });
}

/**
 * Parse CSV string to array of objects
 */
export function parseCSV(csvContent: string): Record<string, any>[] {
  const lines = csvContent.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]);
  const records: Record<string, any>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const record: Record<string, any> = {};

    headers.forEach((header, index) => {
      record[header.trim()] = values[index]?.trim() ?? '';
    });

    records.push(record);
  }

  return records;
}

/**
 * Parse a single CSV line, handling quoted values
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

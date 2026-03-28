/**
 * File Upload Validation Utility
 *
 * Provides secure file upload validation including:
 * - File type validation against allowlist (MIME type + extension)
 * - File size validation with configurable limits
 * - Secure filename generation using crypto.randomUUID()
 * - Filename sanitization to prevent path traversal
 */

/**
 * Allowed MIME types mapped to their valid extensions
 */
export const ALLOWED_FILE_TYPES: Record<string, string[]> = {
  // Images
  'image/jpeg': ['jpg', 'jpeg'],
  'image/png': ['png'],
  'image/gif': ['gif'],
  'image/webp': ['webp'],
  'image/svg+xml': ['svg'],
  // Documents
  'application/pdf': ['pdf'],
  'application/msword': ['doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['docx'],
  'application/vnd.ms-excel': ['xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['xlsx'],
  'text/csv': ['csv'],
  'text/plain': ['txt'],
  // Video
  'video/mp4': ['mp4'],
  'video/quicktime': ['mov'],
  'video/webm': ['webm'],
};

/**
 * Maximum file sizes per category (in bytes)
 */
export const MAX_FILE_SIZES: Record<string, number> = {
  image: 5 * 1024 * 1024,       // 5MB for images
  document: 10 * 1024 * 1024,   // 10MB for documents
  video: 100 * 1024 * 1024,     // 100MB for videos
  default: 10 * 1024 * 1024,    // 10MB default
};

/**
 * Allowed file extensions (lowercase)
 */
export const ALLOWED_EXTENSIONS = new Set([
  'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg',
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'txt',
  'mp4', 'mov', 'webm',
]);

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

export interface FileValidationOptions {
  /** Override max file size in bytes */
  maxSize?: number;
  /** Override allowed MIME types */
  allowedTypes?: string[];
  /** Override allowed extensions */
  allowedExtensions?: string[];
}

/**
 * Get the file category based on MIME type
 */
function getFileCategory(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  return 'document';
}

/**
 * Extract and validate file extension from filename
 */
function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  if (parts.length < 2) return '';
  return (parts.pop() || '').toLowerCase();
}

/**
 * Validate a file before upload
 *
 * Checks:
 * 1. MIME type against allowlist
 * 2. File extension against allowlist
 * 3. Extension matches MIME type
 * 4. File size against category-specific limits
 */
export function validateFileUpload(
  file: File,
  options: FileValidationOptions = {}
): FileValidationResult {
  const {
    maxSize,
    allowedTypes,
    allowedExtensions,
  } = options;

  // Check MIME type
  const validTypes = allowedTypes || Object.keys(ALLOWED_FILE_TYPES);
  if (!validTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File type "${file.type}" is not allowed. Accepted types: ${validTypes.join(', ')}`,
    };
  }

  // Check file extension
  const extension = getFileExtension(file.name);
  const validExtensions = allowedExtensions
    ? new Set(allowedExtensions.map(e => e.toLowerCase()))
    : ALLOWED_EXTENSIONS;

  if (!extension || !validExtensions.has(extension)) {
    return {
      valid: false,
      error: `File extension ".${extension}" is not allowed.`,
    };
  }

  // Verify extension matches MIME type (prevents double-extension attacks like file.jpg.exe)
  const expectedExtensions = ALLOWED_FILE_TYPES[file.type];
  if (expectedExtensions && !expectedExtensions.includes(extension)) {
    return {
      valid: false,
      error: `File extension ".${extension}" does not match the file type "${file.type}".`,
    };
  }

  // Check file size
  const category = getFileCategory(file.type);
  const sizeLimit = maxSize || MAX_FILE_SIZES[category] || MAX_FILE_SIZES.default;
  if (file.size > sizeLimit) {
    const sizeMB = Math.round(sizeLimit / (1024 * 1024));
    return {
      valid: false,
      error: `File size exceeds the ${sizeMB}MB limit.`,
    };
  }

  // Check for empty files
  if (file.size === 0) {
    return {
      valid: false,
      error: 'File is empty.',
    };
  }

  return { valid: true };
}

/**
 * Sanitize a filename by removing path separators and special characters
 */
export function sanitizeFilename(filename: string): string {
  return filename
    // Remove path separators
    .replace(/[/\\]/g, '')
    // Remove null bytes
    .replace(/\0/g, '')
    // Remove directory traversal patterns
    .replace(/\.\./g, '')
    // Keep only safe characters: alphanumeric, dash, underscore, dot, space
    .replace(/[^a-zA-Z0-9\-_. ]/g, '')
    .trim()
    .slice(0, 255);
}

/**
 * Generate a secure filename using crypto.randomUUID()
 *
 * Format: {uuid}.{extension}
 */
export function generateSecureFilename(originalFilename: string): string {
  const extension = getFileExtension(originalFilename);
  const uuid = crypto.randomUUID();

  if (extension && ALLOWED_EXTENSIONS.has(extension)) {
    return `${uuid}.${extension}`;
  }

  // Fallback: no extension
  return uuid;
}

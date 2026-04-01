/**
 * Server-Side Password Policy Enforcement
 *
 * Validates password strength with configurable requirements:
 * - Minimum length (8 characters)
 * - Character class requirements (uppercase, lowercase, digit, special)
 * - Common password rejection (top 100 most common)
 *
 * Used by: verify-auth-otp, reset-password-otp
 */

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

// Minimum password requirements
const MIN_LENGTH = 8;
const MAX_LENGTH = 128;

// Top 100 most common passwords (lowercase for comparison)
const COMMON_PASSWORDS = new Set([
  'password', '123456', '12345678', 'qwerty', 'abc123', 'monkey', '1234567',
  'letmein', 'trustno1', 'dragon', 'baseball', 'iloveyou', 'master', 'sunshine',
  'ashley', 'bailey', 'passw0rd', 'shadow', '123123', '654321', 'superman',
  'qazwsx', 'michael', 'football', 'password1', 'password123', 'batman',
  '1234', '12345', '123456789', '1234567890', '0987654321', 'access',
  'hello', 'charlie', 'donald', '!@#$%^&*', 'aa123456', 'admin', 'admin123',
  'welcome', 'welcome1', 'p@ssw0rd', 'p@ssword', 'pass@123', 'pass123',
  'princess', 'rockyou', 'rosebud', 'password2', 'password3', '1q2w3e4r',
  '1qaz2wsx', 'login', 'starwars', 'solo', 'qwerty123', 'qwertyuiop',
  'flower', 'hottie', 'loveme', 'zaq1zaq1', 'mustang', 'test', 'test123',
  'dallas', 'jordan', 'robert', 'thomas', 'hockey', 'ranger', 'daniel',
  'buster', 'soccer', 'harley', 'andrew', 'tigger', 'joshua', 'matrix',
  'george', 'summer', 'maverick', 'nicole', 'hunter', 'fuckyou', 'pepper',
  'ginger', 'killer', 'thunder', 'cookie', 'jessica', 'joshua1', 'maggie',
  'computer', 'amanda', 'junior', 'jennifer', 'corvette', 'mercedes',
  'taylor', 'golfer', 'cheese', 'martin', 'yankees', 'arsenal', 'hammer',
  'angels', 'silver', 'austin', 'brandx', 'chicken', 'william', 'sparky',
  'cowboy', 'camaro', 'matrix1', 'diamond',
]);

/**
 * Validate password strength against security policy.
 *
 * @param password - The password to validate
 * @returns Validation result with specific error messages
 */
export function validatePasswordStrength(password: string): PasswordValidationResult {
  const errors: string[] = [];

  // Length checks
  if (!password || password.length < MIN_LENGTH) {
    errors.push(`Password must be at least ${MIN_LENGTH} characters long`);
  }

  if (password && password.length > MAX_LENGTH) {
    errors.push(`Password must be no more than ${MAX_LENGTH} characters long`);
  }

  // Character class checks (only if password is provided)
  if (password) {
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one digit');
    }

    if (!/[^A-Za-z0-9]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    // Common password check (case-insensitive)
    if (COMMON_PASSWORDS.has(password.toLowerCase())) {
      errors.push('This password is too common. Please choose a more unique password');
    }

    // Repetitive character check (e.g., "aaaaaaaa" or "11111111")
    if (/^(.)\1+$/.test(password)) {
      errors.push('Password cannot consist of a single repeated character');
    }

    // Sequential character check (e.g., "abcdefgh" or "12345678")
    if (/^(012345|123456|234567|345678|456789|567890|abcdef|bcdefg|cdefgh)/.test(password.toLowerCase())) {
      errors.push('Password cannot be a simple sequential pattern');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

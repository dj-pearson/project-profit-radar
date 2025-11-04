/**
 * Safe String Operations Utility
 * Provides defensive wrappers around string operations to prevent crashes
 */

/**
 * Safely performs string replacement, preventing crashes from null/undefined values
 * @param input - The string to perform replacement on
 * @param searchValue - The value to search for (string or RegExp)
 * @param replaceValue - The value to replace with
 * @returns The string with replacements, or the original input if invalid
 */
export function safeReplace(
  input: any,
  searchValue: string | RegExp,
  replaceValue: string
): string {
  try {
    // Check if input is null, undefined, or not a string
    if (input === null || input === undefined) {
      console.warn('safeReplace: Input is null or undefined', { input, searchValue });
      return '';
    }

    // Convert to string if not already
    const str = String(input);

    // Validate regex if searchValue is RegExp
    if (searchValue instanceof RegExp) {
      // Test that regex is valid
      searchValue.test('test');
    }

    // Perform replacement
    return str.replace(searchValue, replaceValue);
  } catch (error) {
    console.error('safeReplace: Error during replacement', {
      error,
      input,
      searchValue,
      replaceValue
    });
    // Return original input as string or empty string
    return input ? String(input) : '';
  }
}

/**
 * Safely performs global string replacement
 * @param input - The string to perform replacement on
 * @param searchValue - The value to search for (string or RegExp)
 * @param replaceValue - The value to replace with
 * @returns The string with all replacements, or the original input if invalid
 */
export function safeReplaceAll(
  input: any,
  searchValue: string | RegExp,
  replaceValue: string
): string {
  try {
    if (input === null || input === undefined) {
      console.warn('safeReplaceAll: Input is null or undefined');
      return '';
    }

    const str = String(input);

    // If searchValue is a string, use replaceAll if available, or global regex
    if (typeof searchValue === 'string') {
      if (str.replaceAll) {
        return str.replaceAll(searchValue, replaceValue);
      } else {
        // Fallback for older environments
        const escapedSearch = searchValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return str.replace(new RegExp(escapedSearch, 'g'), replaceValue);
      }
    }

    // If searchValue is RegExp, ensure it has global flag
    if (searchValue instanceof RegExp) {
      if (!searchValue.global) {
        // Add global flag if missing
        searchValue = new RegExp(searchValue.source, searchValue.flags + 'g');
      }
      return str.replace(searchValue, replaceValue);
    }

    return str;
  } catch (error) {
    console.error('safeReplaceAll: Error during replacement', {
      error,
      input,
      searchValue,
      replaceValue
    });
    return input ? String(input) : '';
  }
}

/**
 * Safely trims a string
 * @param input - The string to trim
 * @returns The trimmed string, or empty string if invalid
 */
export function safeTrim(input: any): string {
  try {
    if (input === null || input === undefined) {
      return '';
    }
    return String(input).trim();
  } catch (error) {
    console.error('safeTrim: Error during trim', { error, input });
    return '';
  }
}

/**
 * Safely converts value to string
 * @param input - The value to convert
 * @param defaultValue - Default value if conversion fails
 * @returns The string representation, or default value
 */
export function safeToString(input: any, defaultValue: string = ''): string {
  try {
    if (input === null || input === undefined) {
      return defaultValue;
    }
    return String(input);
  } catch (error) {
    console.error('safeToString: Error during conversion', { error, input });
    return defaultValue;
  }
}

/**
 * Safely splits a string
 * @param input - The string to split
 * @param separator - The separator to split on
 * @param limit - Maximum number of splits
 * @returns Array of split strings, or empty array if invalid
 */
export function safeSplit(
  input: any,
  separator: string | RegExp,
  limit?: number
): string[] {
  try {
    if (input === null || input === undefined) {
      return [];
    }
    const str = String(input);
    return str.split(separator, limit);
  } catch (error) {
    console.error('safeSplit: Error during split', { error, input, separator });
    return [];
  }
}

/**
 * Safely performs substring operation
 * @param input - The string to extract from
 * @param start - Start index
 * @param end - End index (optional)
 * @returns The substring, or empty string if invalid
 */
export function safeSubstring(input: any, start: number, end?: number): string {
  try {
    if (input === null || input === undefined) {
      return '';
    }
    const str = String(input);
    return str.substring(start, end);
  } catch (error) {
    console.error('safeSub string: Error during substring', {
      error,
      input,
      start,
      end
    });
    return '';
  }
}

/**
 * Safely performs toLowerCase operation
 * @param input - The string to convert
 * @returns Lowercase string, or empty string if invalid
 */
export function safeToLowerCase(input: any): string {
  try {
    if (input === null || input === undefined) {
      return '';
    }
    return String(input).toLowerCase();
  } catch (error) {
    console.error('safeToLowerCase: Error during conversion', { error, input });
    return '';
  }
}

/**
 * Safely performs toUpperCase operation
 * @param input - The string to convert
 * @returns Uppercase string, or empty string if invalid
 */
export function safeToUpperCase(input: any): string {
  try {
    if (input === null || input === undefined) {
      return '';
    }
    return String(input).toUpperCase();
  } catch (error) {
    console.error('safeToUpperCase: Error during conversion', { error, input });
    return '';
  }
}

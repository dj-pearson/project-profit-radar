/**
 * Automated Testing Tool - Form Tester
 *
 * Tests form functionality including validation, submission, and field interactions.
 */

import type { Page } from 'playwright';
import type { TestConfig, TestResult, DiscoveredForm, FormField, TestError } from '../types';
import { Logger } from '../utils/logger';
import { generateId, classifyError, getSeverityFromClassification } from '../utils/helpers';

// ============================================================================
// Test Data Generators
// ============================================================================

const TEST_DATA: Record<string, string | number> = {
  email: 'test@example.com',
  password: 'TestPassword123!',
  text: 'Test input value',
  name: 'Test User',
  phone: '555-123-4567',
  tel: '5551234567',
  number: '42',
  url: 'https://example.com',
  search: 'search query',
  date: '2024-01-15',
  time: '14:30',
  datetime: '2024-01-15T14:30',
  'datetime-local': '2024-01-15T14:30',
  month: '2024-01',
  week: '2024-W03',
  color: '#ff0000',
  range: '50',
  textarea: 'This is a longer test value for textarea fields.',
};

const INVALID_DATA: Record<string, string> = {
  email: 'invalid-email',
  password: '123', // Too short
  phone: 'not-a-phone',
  tel: 'abc',
  number: 'not-a-number',
  url: 'not-a-url',
  date: 'invalid-date',
};

// ============================================================================
// Form Tester
// ============================================================================

export class FormTester {
  private logger: Logger;
  private config: TestConfig;

  constructor(config: TestConfig, logger?: Logger) {
    this.config = config;
    this.logger = logger || new Logger({ context: 'FormTester' });
  }

  /**
   * Test all forms on a page
   */
  async testForms(page: Page, forms: DiscoveredForm[], pageUrl: string): Promise<TestResult[]> {
    const results: TestResult[] = [];

    for (const form of forms) {
      this.logger.debug(`Testing form: ${form.id}`);

      // Test form visibility
      const visibilityResult = await this.testFormVisibility(page, form, pageUrl);
      results.push(visibilityResult);

      // Test field interactions
      const fieldResults = await this.testFormFields(page, form, pageUrl);
      results.push(...fieldResults);

      // Test form validation (if depth is medium or deep)
      if (this.config.depth !== 'shallow') {
        const validationResults = await this.testFormValidation(page, form, pageUrl);
        results.push(...validationResults);
      }

      // Test form submission (if depth is deep)
      if (this.config.depth === 'deep' && form.hasSubmitButton) {
        const submissionResult = await this.testFormSubmission(page, form, pageUrl);
        results.push(submissionResult);
      }
    }

    return results;
  }

  /**
   * Test form visibility
   */
  private async testFormVisibility(
    page: Page,
    form: DiscoveredForm,
    pageUrl: string
  ): Promise<TestResult> {
    const startTime = Date.now();
    const testId = generateId();

    try {
      const isVisible = await page.locator(form.selector).isVisible({ timeout: 5000 });

      return {
        id: testId,
        type: 'element-visibility',
        name: `Form visibility: ${form.id}`,
        status: isVisible ? 'passed' : 'warning',
        url: pageUrl,
        duration: Date.now() - startTime,
        timestamp: new Date(),
        retryCount: 0,
        data: {
          formId: form.id,
          selector: form.selector,
          visible: isVisible,
        },
      };
    } catch (error) {
      return this.createErrorResult(
        testId,
        'element-visibility',
        `Form visibility: ${form.id}`,
        pageUrl,
        error as Error,
        startTime
      );
    }
  }

  /**
   * Test form field interactions
   */
  private async testFormFields(
    page: Page,
    form: DiscoveredForm,
    pageUrl: string
  ): Promise<TestResult[]> {
    const results: TestResult[] = [];

    for (const field of form.fields) {
      if (field.type === 'hidden' || field.type === 'submit') continue;

      const startTime = Date.now();
      const testId = generateId();

      try {
        const fieldLocator = page.locator(field.selector);
        const isVisible = await fieldLocator.isVisible({ timeout: 5000 });

        if (!isVisible) {
          results.push({
            id: testId,
            type: 'element-visibility',
            name: `Field visibility: ${field.name || field.selector}`,
            status: 'warning',
            url: pageUrl,
            duration: Date.now() - startTime,
            timestamp: new Date(),
            retryCount: 0,
            data: {
              formId: form.id,
              field: field.name,
              selector: field.selector,
            },
          });
          continue;
        }

        // Test field is focusable
        await fieldLocator.focus();

        // Test field accepts input
        if (['text', 'email', 'password', 'tel', 'number', 'search', 'url'].includes(field.type)) {
          const testValue = this.getTestValue(field);
          await fieldLocator.fill(String(testValue));

          // Verify value was set
          const actualValue = await fieldLocator.inputValue();
          const valueSet = actualValue.length > 0;

          results.push({
            id: testId,
            type: 'element-interaction',
            name: `Field input: ${field.name || field.selector}`,
            status: valueSet ? 'passed' : 'failed',
            url: pageUrl,
            duration: Date.now() - startTime,
            timestamp: new Date(),
            retryCount: 0,
            data: {
              formId: form.id,
              field: field.name,
              type: field.type,
              expectedValue: testValue,
              actualValue,
            },
          });

          // Clear field for next test
          await fieldLocator.fill('');
        } else if (field.type === 'checkbox' || field.type === 'radio') {
          // Test checkbox/radio
          await fieldLocator.check();
          const isChecked = await fieldLocator.isChecked();

          results.push({
            id: testId,
            type: 'element-interaction',
            name: `Field check: ${field.name || field.selector}`,
            status: isChecked ? 'passed' : 'failed',
            url: pageUrl,
            duration: Date.now() - startTime,
            timestamp: new Date(),
            retryCount: 0,
            data: {
              formId: form.id,
              field: field.name,
              type: field.type,
              checked: isChecked,
            },
          });

          // Uncheck for next test
          if (field.type === 'checkbox') {
            await fieldLocator.uncheck();
          }
        } else if (field.type === 'select') {
          // Test select field
          const options = await fieldLocator.locator('option').allTextContents();

          if (options.length > 1) {
            await fieldLocator.selectOption({ index: 1 });

            results.push({
              id: testId,
              type: 'element-interaction',
              name: `Field select: ${field.name || field.selector}`,
              status: 'passed',
              url: pageUrl,
              duration: Date.now() - startTime,
              timestamp: new Date(),
              retryCount: 0,
              data: {
                formId: form.id,
                field: field.name,
                type: field.type,
                options: options.length,
              },
            });
          }
        } else {
          // Generic interaction test
          results.push({
            id: testId,
            type: 'element-interaction',
            name: `Field focus: ${field.name || field.selector}`,
            status: 'passed',
            url: pageUrl,
            duration: Date.now() - startTime,
            timestamp: new Date(),
            retryCount: 0,
            data: {
              formId: form.id,
              field: field.name,
              type: field.type,
            },
          });
        }
      } catch (error) {
        results.push(
          this.createErrorResult(
            testId,
            'element-interaction',
            `Field test: ${field.name || field.selector}`,
            pageUrl,
            error as Error,
            startTime
          )
        );
      }
    }

    return results;
  }

  /**
   * Test form validation
   */
  private async testFormValidation(
    page: Page,
    form: DiscoveredForm,
    pageUrl: string
  ): Promise<TestResult[]> {
    const results: TestResult[] = [];

    // Find required fields
    const requiredFields = form.fields.filter((f) => f.required);

    if (requiredFields.length === 0) {
      return results;
    }

    const startTime = Date.now();
    const testId = generateId();

    try {
      // Test required field validation by trying to submit empty form
      if (form.hasSubmitButton) {
        const submitButton = page.locator(`${form.selector} button[type="submit"], ${form.selector} input[type="submit"]`);

        if (await submitButton.isVisible({ timeout: 2000 })) {
          await submitButton.click();

          // Check for validation errors
          const validationErrors = await page.evaluate((formSelector) => {
            const form = document.querySelector(formSelector) as HTMLFormElement;
            if (!form) return [];

            return Array.from(form.querySelectorAll(':invalid')).map((el) => ({
              name: (el as HTMLInputElement).name,
              validationMessage: (el as HTMLInputElement).validationMessage,
            }));
          }, form.selector);

          results.push({
            id: testId,
            type: 'form-validation',
            name: `Required field validation: ${form.id}`,
            status: validationErrors.length > 0 ? 'passed' : 'warning',
            url: pageUrl,
            duration: Date.now() - startTime,
            timestamp: new Date(),
            retryCount: 0,
            data: {
              formId: form.id,
              requiredFieldsCount: requiredFields.length,
              validationErrors,
            },
          });
        }
      }

      // Test individual field validation with invalid data
      for (const field of form.fields) {
        if (field.pattern || ['email', 'url', 'number', 'tel'].includes(field.type)) {
          const invalidValue = INVALID_DATA[field.type] || 'invalid';
          const fieldTestId = generateId();
          const fieldStartTime = Date.now();

          try {
            const fieldLocator = page.locator(field.selector);

            if (await fieldLocator.isVisible({ timeout: 2000 })) {
              await fieldLocator.fill(invalidValue);
              await fieldLocator.blur();

              // Check if field shows validation error
              const isInvalid = await page.evaluate((selector) => {
                const el = document.querySelector(selector) as HTMLInputElement;
                return el ? !el.validity.valid : false;
              }, field.selector);

              results.push({
                id: fieldTestId,
                type: 'form-validation',
                name: `Field validation: ${field.name || field.selector}`,
                status: isInvalid ? 'passed' : 'warning',
                url: pageUrl,
                duration: Date.now() - fieldStartTime,
                timestamp: new Date(),
                retryCount: 0,
                data: {
                  formId: form.id,
                  field: field.name,
                  type: field.type,
                  invalidValue,
                  validationTriggered: isInvalid,
                },
              });

              // Clear field
              await fieldLocator.fill('');
            }
          } catch {
            // Skip field if it fails
          }
        }
      }
    } catch (error) {
      results.push(
        this.createErrorResult(
          testId,
          'form-validation',
          `Form validation: ${form.id}`,
          pageUrl,
          error as Error,
          startTime
        )
      );
    }

    return results;
  }

  /**
   * Test form submission (mock - doesn't actually submit)
   */
  private async testFormSubmission(
    page: Page,
    form: DiscoveredForm,
    pageUrl: string
  ): Promise<TestResult> {
    const startTime = Date.now();
    const testId = generateId();

    try {
      // Fill form with valid test data
      for (const field of form.fields) {
        if (field.type === 'hidden' || field.type === 'submit') continue;

        const fieldLocator = page.locator(field.selector);
        if (await fieldLocator.isVisible({ timeout: 2000 })) {
          const testValue = this.getTestValue(field);

          if (['text', 'email', 'password', 'tel', 'number', 'search', 'url', 'textarea'].includes(field.type)) {
            await fieldLocator.fill(String(testValue));
          } else if (field.type === 'checkbox') {
            await fieldLocator.check();
          } else if (field.type === 'select') {
            const options = await fieldLocator.locator('option').count();
            if (options > 1) {
              await fieldLocator.selectOption({ index: 1 });
            }
          }
        }
      }

      // Check if form is valid
      const isFormValid = await page.evaluate((formSelector) => {
        const form = document.querySelector(formSelector) as HTMLFormElement;
        return form ? form.checkValidity() : false;
      }, form.selector);

      return {
        id: testId,
        type: 'form-submission',
        name: `Form submission ready: ${form.id}`,
        status: isFormValid ? 'passed' : 'warning',
        url: pageUrl,
        duration: Date.now() - startTime,
        timestamp: new Date(),
        retryCount: 0,
        data: {
          formId: form.id,
          action: form.action,
          method: form.method,
          fieldsCount: form.fields.length,
          formValid: isFormValid,
          note: 'Form was filled but not submitted (test mode)',
        },
      };
    } catch (error) {
      return this.createErrorResult(
        testId,
        'form-submission',
        `Form submission: ${form.id}`,
        pageUrl,
        error as Error,
        startTime
      );
    }
  }

  /**
   * Get test value for a field
   */
  private getTestValue(field: FormField): string | number {
    // Check if field name suggests a type
    const nameLower = (field.name || '').toLowerCase();

    if (nameLower.includes('email')) return TEST_DATA.email;
    if (nameLower.includes('password')) return TEST_DATA.password;
    if (nameLower.includes('phone') || nameLower.includes('tel')) return TEST_DATA.phone;
    if (nameLower.includes('name')) return TEST_DATA.name;
    if (nameLower.includes('url') || nameLower.includes('website')) return TEST_DATA.url;

    // Use field type
    return TEST_DATA[field.type] || TEST_DATA.text;
  }

  /**
   * Create an error result
   */
  private createErrorResult(
    testId: string,
    type: TestResult['type'],
    name: string,
    url: string,
    error: Error,
    startTime: number
  ): TestResult {
    const classification = classifyError(error.message);

    return {
      id: testId,
      type,
      name,
      status: 'error',
      url,
      duration: Date.now() - startTime,
      timestamp: new Date(),
      retryCount: 0,
      error: {
        message: error.message,
        stack: error.stack,
        classification,
      },
    };
  }
}

// ============================================================================
// Export
// ============================================================================

export default FormTester;

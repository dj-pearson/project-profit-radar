import { describe, it, expect } from 'vitest';
import { resolveNewTarget, isEditableTarget } from '../useNavigationShortcuts';

describe('resolveNewTarget (context-aware "N")', () => {
  it('maps a route to its new-item destination', () => {
    // /create-project, not /projects/new. There is no /projects/new route, and
    // /projects/:projectId matched it - so pressing N on a project page opened
    // the project detail view for a project whose id was the string 'new'.
    expect(resolveNewTarget('/projects')).toBe('/create-project');
    expect(resolveNewTarget('/projects/abc-123')).toBe('/create-project');
    // /invoices/new still has no route. Left as-is deliberately: there is no
    // create-invoice page to point at, and sending "new invoice" to the list is
    // a product decision rather than a repoint (US-312 baseline).
    expect(resolveNewTarget('/invoices')).toBe('/invoices/new');
    expect(resolveNewTarget('/time-tracking')).toBe('/time-tracking');
    expect(resolveNewTarget('/crm')).toBe('/crm');
  });

  it('returns null where there is no new-item action', () => {
    expect(resolveNewTarget('/dashboard')).toBeNull();
    expect(resolveNewTarget('/settings')).toBeNull();
  });
});

describe('isEditableTarget (shortcuts disabled while typing)', () => {
  it('is true for form fields and contenteditable', () => {
    expect(isEditableTarget(document.createElement('input'))).toBe(true);
    expect(isEditableTarget(document.createElement('textarea'))).toBe(true);
    expect(isEditableTarget(document.createElement('select'))).toBe(true);
    const div = document.createElement('div');
    Object.defineProperty(div, 'isContentEditable', { value: true });
    expect(isEditableTarget(div)).toBe(true);
  });

  it('is false for non-editable elements and null', () => {
    expect(isEditableTarget(document.createElement('div'))).toBe(false);
    expect(isEditableTarget(document.createElement('button'))).toBe(false);
    expect(isEditableTarget(null)).toBe(false);
  });
});

import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen } from '@testing-library/react';
import { SubcontractorFormDialog } from '../SubcontractorFormDialog';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
} from '@/components/ui/responsive-dialog';

// US-379: the form dialogs field users open most are a vaul Drawer (bottom
// sheet, drag to dismiss) below sm and the centred Dialog from sm up.

const originalMatchMedia = window.matchMedia;

function setViewportNarrow(narrow: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: narrow && query === '(max-width: 639px)',
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

afterEach(() => {
  window.matchMedia = originalMatchMedia;
});

const renderSubcontractorForm = () =>
  render(
    <SubcontractorFormDialog
      open
      onOpenChange={() => {}}
      saving={false}
      onSubmit={async () => {}}
    />
  );

describe('SubcontractorFormDialog on phones and desktops', () => {
  it('renders the form in a Drawer below sm', () => {
    setViewportNarrow(true);
    renderSubcontractorForm();
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('data-vaul-drawer');
    expect(screen.getByRole('dialog', { name: 'Add subcontractor' })).toBe(dialog);
    expect(dialog.querySelector('form')).not.toBeNull();
  });

  it('renders the same form in the centred Dialog from sm up', () => {
    setViewportNarrow(false);
    renderSubcontractorForm();
    const dialog = screen.getByRole('dialog');
    expect(dialog).not.toHaveAttribute('data-vaul-drawer');
    expect(dialog.querySelector('form')).not.toBeNull();
  });
});

describe('ResponsiveDialog wrapping a form', () => {
  const renderForm = (forceMobile: boolean) =>
    render(
      <ResponsiveDialog open forceMobile={forceMobile}>
        <ResponsiveDialogContent>
          <ResponsiveDialogTitle>Log expense</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>Amount and receipt</ResponsiveDialogDescription>
          <form aria-label="expense">
            <input aria-label="Amount" />
            <button type="submit">Save</button>
          </form>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    );

  it('renders a Drawer when forceMobile is set, whatever the viewport', () => {
    setViewportNarrow(false);
    renderForm(true);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('data-vaul-drawer');
    expect(screen.getByRole('form', { name: 'expense' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Amount' })).toBeInTheDocument();
  });

  it('renders the Dialog when forceMobile is false, whatever the viewport', () => {
    setViewportNarrow(true);
    renderForm(false);
    expect(screen.getByRole('dialog')).not.toHaveAttribute('data-vaul-drawer');
  });
});

describe('ResponsiveDialog adoption', () => {
  // The ten most-used create/edit forms. Dropping one back to the plain
  // Dialog puts a desktop modal on a phone again.
  const ADOPTERS = [
    'src/components/ProjectWizard.tsx',
    'src/components/financial/ExpenseTrackingSystem.tsx',
    'src/components/project/ProjectEstimates.tsx',
    'src/components/workflow/RFISubmittalManagement.tsx',
    'src/components/crm/LeadEditDialog.tsx',
    'src/components/customers/ContactPicker.tsx',
    'src/components/subcontractors/SubcontractorFormDialog.tsx',
    'src/components/project/tabs/ProjectPunchList.tsx',
    'src/pages/DailyReports.tsx',
    'src/pages/ChangeOrders.tsx',
  ];

  it.each(ADOPTERS)('%s uses ResponsiveDialog', (file) => {
    const source = readFileSync(resolve(process.cwd(), file), 'utf8');
    expect(source).toMatch(/from ['"]@\/components\/ui\/responsive-dialog['"]/);
    expect(source).toMatch(/<ResponsiveDialog[\s>]/);
  });
});

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '../dialog';
import { Sheet, SheetContent, SheetTitle } from '../sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../select';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '../responsive-dialog';

// US-379: shared primitives must give phones 44px targets and bottom-sheet
// dialogs while keeping the desktop (sm and up) layout unchanged.

describe('DialogContent on small screens', () => {
  const renderDialog = (className?: string) =>
    render(
      <Dialog open>
        <DialogContent className={className} data-testid="content">
          <DialogTitle>Title</DialogTitle>
          <DialogDescription>Body</DialogDescription>
          <DialogFooter data-testid="footer">footer</DialogFooter>
        </DialogContent>
      </Dialog>
    );

  it('is a full-width bottom sheet below sm', () => {
    renderDialog();
    const content = screen.getByTestId('content');
    expect(content).toHaveClass(
      'w-full',
      'inset-x-0',
      'bottom-0',
      'rounded-t-2xl',
      'max-h-[90dvh]',
      'overflow-y-auto',
      'data-[state=open]:slide-in-from-bottom'
    );
  });

  it('is the centred modal from sm up', () => {
    renderDialog();
    const content = screen.getByTestId('content');
    expect(content).toHaveClass(
      'max-w-lg',
      'sm:left-[50%]',
      'sm:top-[50%]',
      'sm:translate-x-[-50%]',
      'sm:translate-y-[-50%]',
      'sm:rounded-lg',
      'sm:bottom-auto'
    );
  });

  it('lets a consumer width override win at every breakpoint', () => {
    renderDialog('max-w-2xl');
    const content = screen.getByTestId('content');
    expect(content).toHaveClass('max-w-2xl');
    expect(content).not.toHaveClass('max-w-lg');
    expect(content.className).not.toMatch(/sm:max-w-/);
  });

  it('gives the close button a 44px hit area below sm', () => {
    renderDialog();
    const close = screen.getByRole('button', { name: 'Close' });
    expect(close).toHaveClass('h-11', 'w-11', 'sm:h-auto', 'sm:w-auto');
  });

  it('spaces stacked footer buttons on phones', () => {
    renderDialog();
    expect(screen.getByTestId('footer')).toHaveClass('flex-col-reverse', 'gap-2', 'sm:flex-row');
  });
});

describe('SheetContent', () => {
  it('gives the close button a 44px hit area below sm', () => {
    render(
      <Sheet open>
        <SheetContent>
          <SheetTitle>Nav</SheetTitle>
        </SheetContent>
      </Sheet>
    );
    expect(screen.getByRole('button', { name: 'Close' })).toHaveClass('h-11', 'w-11', 'sm:h-auto');
  });

  it('caps a bottom sheet at 90dvh and scrolls', () => {
    render(
      <Sheet open>
        <SheetContent side="bottom" data-testid="sheet">
          <SheetTitle>Filters</SheetTitle>
        </SheetContent>
      </Sheet>
    );
    expect(screen.getByTestId('sheet')).toHaveClass('max-h-[90dvh]', 'overflow-y-auto', 'rounded-t-2xl');
  });
});

describe('SelectTrigger', () => {
  it('is 44px below sm and 40px from sm up', () => {
    render(
      <Select>
        <SelectTrigger aria-label="Status">
          <SelectValue placeholder="Pick" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="a">A</SelectItem>
        </SelectContent>
      </Select>
    );
    expect(screen.getByRole('combobox', { name: 'Status' })).toHaveClass('h-11', 'sm:h-10');
  });
});

describe('ResponsiveDialog', () => {
  const renderResponsive = (forceMobile: boolean) =>
    render(
      <ResponsiveDialog open forceMobile={forceMobile}>
        <ResponsiveDialogContent className="max-w-2xl" data-testid="rd">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>New task</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>Fill it in</ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <ResponsiveDialogFooter>footer</ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    );

  it('renders the Dialog on desktop', () => {
    renderResponsive(false);
    const content = screen.getByTestId('rd');
    expect(content).toHaveClass('sm:top-[50%]', 'max-w-2xl');
    expect(content).not.toHaveAttribute('data-vaul-drawer');
    expect(screen.getByRole('dialog', { name: 'New task' })).toBeInTheDocument();
  });

  it('renders a full-width Drawer on mobile', () => {
    renderResponsive(true);
    const content = screen.getByTestId('rd');
    expect(content).toHaveAttribute('data-vaul-drawer');
    expect(content).toHaveClass('inset-x-0', 'bottom-0', 'max-h-[90dvh]', 'max-w-none');
    expect(content).not.toHaveClass('max-w-2xl');
    expect(screen.getByRole('dialog', { name: 'New task' })).toBeInTheDocument();
  });

  it('follows the viewport query when not forced', () => {
    render(
      <ResponsiveDialog open>
        <ResponsiveDialogContent data-testid="rd">
          <ResponsiveDialogTitle>T</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>D</ResponsiveDialogDescription>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    );
    // setup.ts mocks matchMedia to never match, i.e. a desktop viewport.
    expect(screen.getByTestId('rd')).not.toHaveAttribute('data-vaul-drawer');
  });
});

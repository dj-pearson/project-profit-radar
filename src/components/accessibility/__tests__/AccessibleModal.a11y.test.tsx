import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AccessibleModal } from '../AccessibleModal';

// Mock the accessibility helpers hooks
vi.mock('@/hooks/useAccessibilityHelpers', () => {
  let idCounter = 0;
  return {
    useFocusTrap: () => ({ current: null }),
    useAriaId: (prefix: string) => `${prefix}-${++idCounter}`,
    useEscapeKey: (callback: () => void, enabled: boolean) => {
      // Simulate escape key listener
      if (enabled) {
        const handler = (e: KeyboardEvent) => {
          if (e.key === 'Escape') callback();
        };
        document.addEventListener('keydown', handler);
        // Note: in tests, cleanup won't happen automatically
      }
    },
    useClickOutside: () => ({ current: null }),
  };
});

describe('AccessibleModal a11y', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    title: 'Test Modal',
  };

  it('renders with role dialog', () => {
    render(<AccessibleModal {...defaultProps}><p>Content</p></AccessibleModal>);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('has aria-labelledby linked to title', () => {
    render(<AccessibleModal {...defaultProps}><p>Content</p></AccessibleModal>);
    const dialog = screen.getByRole('dialog');
    const labelledBy = dialog.getAttribute('aria-labelledby');
    expect(labelledBy).toBeTruthy();
    // Verify the title element with that ID exists
    const titleElement = document.getElementById(labelledBy!);
    expect(titleElement).toBeTruthy();
    expect(titleElement?.textContent).toBe('Test Modal');
  });

  it('has aria-modal set to true', () => {
    render(<AccessibleModal {...defaultProps}><p>Content</p></AccessibleModal>);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('closes on Escape key', () => {
    const onClose = vi.fn();
    render(<AccessibleModal {...defaultProps} onClose={onClose}><p>Content</p></AccessibleModal>);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('does not render when closed', () => {
    render(<AccessibleModal {...defaultProps} isOpen={false}><p>Content</p></AccessibleModal>);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders title text', () => {
    render(<AccessibleModal {...defaultProps}><p>Content</p></AccessibleModal>);
    expect(screen.getByText('Test Modal')).toBeInTheDocument();
  });

  it('has description when provided', () => {
    render(<AccessibleModal {...defaultProps} description="A description"><p>Content</p></AccessibleModal>);
    expect(screen.getByText('A description')).toBeInTheDocument();
  });

  it('has aria-describedby linked to description when provided', () => {
    render(<AccessibleModal {...defaultProps} description="A description"><p>Content</p></AccessibleModal>);
    const dialog = screen.getByRole('dialog');
    const describedBy = dialog.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    const descElement = document.getElementById(describedBy!);
    expect(descElement).toBeTruthy();
    expect(descElement?.textContent).toBe('A description');
  });

  it('does not have aria-describedby when no description', () => {
    render(<AccessibleModal {...defaultProps}><p>Content</p></AccessibleModal>);
    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('aria-describedby')).toBeNull();
  });

  it('renders close button with accessible label', () => {
    render(<AccessibleModal {...defaultProps}><p>Content</p></AccessibleModal>);
    const closeButton = screen.getByLabelText('Close dialog');
    expect(closeButton).toBeInTheDocument();
  });

  it('hides close button when hideCloseButton is true', () => {
    render(<AccessibleModal {...defaultProps} hideCloseButton><p>Content</p></AccessibleModal>);
    expect(screen.queryByLabelText('Close dialog')).not.toBeInTheDocument();
  });

  it('renders footer content when provided', () => {
    render(
      <AccessibleModal {...defaultProps} footer={<button>Save</button>}>
        <p>Content</p>
      </AccessibleModal>
    );
    expect(screen.getByText('Save')).toBeInTheDocument();
  });

  it('renders children content', () => {
    render(
      <AccessibleModal {...defaultProps}>
        <p>Modal body content</p>
      </AccessibleModal>
    );
    expect(screen.getByText('Modal body content')).toBeInTheDocument();
  });
});

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AccessibleForm, AccessibleFormField, AccessibleSelect, AccessibleTextarea } from '../AccessibleForm';

describe('AccessibleForm a11y', () => {
  it('renders form with aria-label', () => {
    render(
      <AccessibleForm onSubmit={vi.fn()} ariaLabel="Test form">
        <div />
      </AccessibleForm>
    );
    const form = screen.getByRole('form');
    expect(form).toHaveAttribute('aria-label', 'Test form');
  });

  it('renders form with noValidate for custom validation', () => {
    render(
      <AccessibleForm onSubmit={vi.fn()} ariaLabel="Test form">
        <div />
      </AccessibleForm>
    );
    const form = screen.getByRole('form');
    expect(form).toHaveAttribute('novalidate');
  });

  it('includes a live region for screen reader announcements', () => {
    render(
      <AccessibleForm onSubmit={vi.fn()} ariaLabel="Test form">
        <div />
      </AccessibleForm>
    );
    const liveRegion = screen.getByRole('status');
    expect(liveRegion).toHaveAttribute('aria-live', 'assertive');
    expect(liveRegion).toHaveAttribute('aria-atomic', 'true');
  });
});

describe('AccessibleFormField a11y', () => {
  const renderField = (props = {}) =>
    render(
      <AccessibleForm onSubmit={vi.fn()} ariaLabel="Test">
        <AccessibleFormField name="email" label="Email" {...props} />
      </AccessibleForm>
    );

  it('renders input with associated label', () => {
    renderField();
    expect(screen.getByLabelText(/Email/)).toBeInTheDocument();
  });

  it('marks required fields with aria-required', () => {
    renderField({ required: true });
    const input = screen.getByLabelText(/Email/);
    expect(input).toHaveAttribute('aria-required', 'true');
  });

  it('has aria-required false when not required', () => {
    renderField({ required: false });
    const input = screen.getByLabelText(/Email/);
    expect(input).toHaveAttribute('aria-required', 'false');
  });

  it('sets aria-invalid when error is provided', () => {
    renderField({ error: 'Email is required' });
    const input = screen.getByLabelText(/Email/);
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  it('has aria-invalid false when no error', () => {
    renderField();
    const input = screen.getByLabelText(/Email/);
    expect(input).toHaveAttribute('aria-invalid', 'false');
  });

  it('displays error message with role alert', () => {
    renderField({ error: 'Email is required' });
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Email is required');
  });

  it('links error message via aria-describedby', () => {
    renderField({ error: 'Email is required' });
    const input = screen.getByLabelText(/Email/);
    const describedBy = input.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    const errorElement = document.getElementById(describedBy!.split(' ')[0]);
    expect(errorElement).toBeTruthy();
    expect(errorElement?.textContent).toContain('Email is required');
  });

  it('shows required indicator for screen readers', () => {
    renderField({ required: true });
    expect(screen.getByText('(required)')).toBeInTheDocument();
  });

  it('shows visual asterisk for required fields', () => {
    renderField({ required: true });
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('renders help text when provided', () => {
    renderField({ helpText: 'Enter your work email' });
    expect(screen.getByText('Enter your work email')).toBeInTheDocument();
  });
});

describe('AccessibleSelect a11y', () => {
  const renderSelect = (props = {}) =>
    render(
      <AccessibleForm onSubmit={vi.fn()} ariaLabel="Test">
        <AccessibleSelect
          name="priority"
          label="Priority"
          options={[
            { value: 'high', label: 'High' },
            { value: 'medium', label: 'Medium' },
            { value: 'low', label: 'Low' },
          ]}
          {...props}
        />
      </AccessibleForm>
    );

  it('renders select with accessible label', () => {
    renderSelect();
    expect(screen.getByLabelText(/Priority/)).toBeInTheDocument();
  });

  it('renders all options', () => {
    renderSelect();
    expect(screen.getByText('High')).toBeInTheDocument();
    expect(screen.getByText('Medium')).toBeInTheDocument();
    expect(screen.getByText('Low')).toBeInTheDocument();
  });

  it('marks required select with aria-required', () => {
    renderSelect({ required: true });
    const select = screen.getByLabelText(/Priority/);
    expect(select).toHaveAttribute('aria-required', 'true');
  });

  it('sets aria-invalid when error is provided', () => {
    renderSelect({ error: 'Priority is required' });
    const select = screen.getByLabelText(/Priority/);
    expect(select).toHaveAttribute('aria-invalid', 'true');
  });

  it('renders placeholder option when provided', () => {
    renderSelect({ placeholder: 'Select a priority' });
    expect(screen.getByText('Select a priority')).toBeInTheDocument();
  });
});

describe('AccessibleTextarea a11y', () => {
  const renderTextarea = (props = {}) =>
    render(
      <AccessibleForm onSubmit={vi.fn()} ariaLabel="Test">
        <AccessibleTextarea name="notes" label="Notes" {...props} />
      </AccessibleForm>
    );

  it('renders textarea with accessible label', () => {
    renderTextarea();
    expect(screen.getByLabelText(/Notes/)).toBeInTheDocument();
  });

  it('marks required textarea with aria-required', () => {
    renderTextarea({ required: true });
    const textarea = screen.getByLabelText(/Notes/);
    expect(textarea).toHaveAttribute('aria-required', 'true');
  });

  it('sets aria-invalid when error is provided', () => {
    renderTextarea({ error: 'Notes are required' });
    const textarea = screen.getByLabelText(/Notes/);
    expect(textarea).toHaveAttribute('aria-invalid', 'true');
  });

  it('renders error with role alert', () => {
    renderTextarea({ error: 'Notes are required' });
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Notes are required');
  });
});

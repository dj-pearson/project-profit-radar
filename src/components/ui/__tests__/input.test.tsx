import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from '../input';

describe('Input', () => {
  describe('rendering', () => {
    it('renders with default props', () => {
      render(<Input />);
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('renders with placeholder', () => {
      render(<Input placeholder="Enter text" />);
      expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
    });

    it('renders with default value', () => {
      render(<Input defaultValue="Hello" />);
      expect(screen.getByRole('textbox')).toHaveValue('Hello');
    });

    it('renders with controlled value', () => {
      render(<Input value="Controlled" onChange={() => {}} />);
      expect(screen.getByRole('textbox')).toHaveValue('Controlled');
    });

    it('applies default styles', () => {
      render(<Input data-testid="input" />);
      const input = screen.getByTestId('input');
      expect(input).toHaveClass('flex', 'h-10', 'w-full', 'rounded-md', 'border');
    });

    it('applies custom className', () => {
      render(<Input className="custom-input" />);
      expect(screen.getByRole('textbox')).toHaveClass('custom-input');
    });
  });

  describe('types', () => {
    it('renders text input by default', () => {
      render(<Input />);
      // Input without explicit type renders as textbox (implicit text type)
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('renders email input', () => {
      render(<Input type="email" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('type', 'email');
    });

    it('renders password input', () => {
      render(<Input type="password" />);
      const input = document.querySelector('input[type="password"]');
      expect(input).toBeInTheDocument();
    });

    it('renders number input', () => {
      render(<Input type="number" />);
      expect(screen.getByRole('spinbutton')).toHaveAttribute('type', 'number');
    });

    it('renders tel input', () => {
      render(<Input type="tel" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('type', 'tel');
    });

    it('renders url input', () => {
      render(<Input type="url" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('type', 'url');
    });

    it('renders search input', () => {
      render(<Input type="search" />);
      expect(screen.getByRole('searchbox')).toHaveAttribute('type', 'search');
    });

    it('renders date input', () => {
      render(<Input type="date" data-testid="date-input" />);
      expect(screen.getByTestId('date-input')).toHaveAttribute('type', 'date');
    });
  });

  describe('interactions', () => {
    it('handles typing', async () => {
      const user = userEvent.setup();
      render(<Input />);
      const input = screen.getByRole('textbox');

      await user.type(input, 'Hello World');
      expect(input).toHaveValue('Hello World');
    });

    it('calls onChange handler', async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      render(<Input onChange={handleChange} />);

      await user.type(screen.getByRole('textbox'), 'a');
      expect(handleChange).toHaveBeenCalled();
    });

    it('calls onFocus handler', async () => {
      const user = userEvent.setup();
      const handleFocus = vi.fn();
      render(<Input onFocus={handleFocus} />);

      await user.click(screen.getByRole('textbox'));
      expect(handleFocus).toHaveBeenCalledTimes(1);
    });

    it('calls onBlur handler', async () => {
      const user = userEvent.setup();
      const handleBlur = vi.fn();
      render(<Input onBlur={handleBlur} />);

      await user.click(screen.getByRole('textbox'));
      await user.tab();
      expect(handleBlur).toHaveBeenCalledTimes(1);
    });

    it('clears value correctly', async () => {
      const user = userEvent.setup();
      render(<Input defaultValue="Initial" />);
      const input = screen.getByRole('textbox');

      await user.clear(input);
      expect(input).toHaveValue('');
    });
  });

  describe('states', () => {
    it('can be disabled', () => {
      render(<Input disabled />);
      expect(screen.getByRole('textbox')).toBeDisabled();
    });

    it('has disabled styling when disabled', () => {
      render(<Input disabled />);
      expect(screen.getByRole('textbox')).toHaveClass('disabled:cursor-not-allowed', 'disabled:opacity-50');
    });

    it('cannot be typed into when disabled', async () => {
      const user = userEvent.setup();
      render(<Input disabled defaultValue="Fixed" />);
      const input = screen.getByRole('textbox');

      await user.type(input, 'More text');
      expect(input).toHaveValue('Fixed');
    });

    it('can be read-only', () => {
      render(<Input readOnly defaultValue="Read only" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('readonly');
    });

    it('can be required', () => {
      render(<Input required />);
      expect(screen.getByRole('textbox')).toBeRequired();
    });
  });

  describe('validation', () => {
    it('supports minLength', () => {
      render(<Input minLength={3} />);
      expect(screen.getByRole('textbox')).toHaveAttribute('minLength', '3');
    });

    it('supports maxLength', () => {
      render(<Input maxLength={100} />);
      expect(screen.getByRole('textbox')).toHaveAttribute('maxLength', '100');
    });

    it('supports pattern', () => {
      render(<Input pattern="[A-Za-z]+" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('pattern', '[A-Za-z]+');
    });
  });

  describe('accessibility', () => {
    it('is focusable', async () => {
      const user = userEvent.setup();
      render(<Input />);

      await user.tab();
      expect(screen.getByRole('textbox')).toHaveFocus();
    });

    it('supports aria-label', () => {
      render(<Input aria-label="Email address" />);
      expect(screen.getByRole('textbox', { name: 'Email address' })).toBeInTheDocument();
    });

    it('supports aria-labelledby', () => {
      render(
        <>
          <label id="email-label">Email</label>
          <Input aria-labelledby="email-label" />
        </>
      );
      expect(screen.getByRole('textbox')).toHaveAttribute('aria-labelledby', 'email-label');
    });

    it('supports aria-describedby', () => {
      render(
        <>
          <Input aria-describedby="help-text" />
          <span id="help-text">Enter your email</span>
        </>
      );
      expect(screen.getByRole('textbox')).toHaveAttribute('aria-describedby', 'help-text');
    });

    it('supports aria-invalid', () => {
      render(<Input aria-invalid="true" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
    });

    it('works with htmlFor label', async () => {
      const user = userEvent.setup();
      render(
        <>
          <label htmlFor="my-input">My Input</label>
          <Input id="my-input" />
        </>
      );

      await user.click(screen.getByText('My Input'));
      expect(screen.getByRole('textbox')).toHaveFocus();
    });
  });

  describe('forwarding ref', () => {
    it('forwards ref to input element', () => {
      const ref = { current: null as HTMLInputElement | null };
      render(<Input ref={ref} />);
      expect(ref.current).toBeInstanceOf(HTMLInputElement);
    });

    it('can focus via ref', () => {
      const ref = { current: null as HTMLInputElement | null };
      render(<Input ref={ref} />);

      ref.current?.focus();
      expect(screen.getByRole('textbox')).toHaveFocus();
    });

    it('can access value via ref', async () => {
      const user = userEvent.setup();
      const ref = { current: null as HTMLInputElement | null };
      render(<Input ref={ref} />);

      await user.type(screen.getByRole('textbox'), 'Test value');
      expect(ref.current?.value).toBe('Test value');
    });
  });

  describe('HTML attributes', () => {
    it('supports name attribute', () => {
      render(<Input name="email" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('name', 'email');
    });

    it('supports autocomplete attribute', () => {
      render(<Input autoComplete="email" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('autocomplete', 'email');
    });

    it('supports data attributes', () => {
      render(<Input data-testid="custom-input" />);
      expect(screen.getByTestId('custom-input')).toBeInTheDocument();
    });

    it('supports form attribute', () => {
      render(<Input form="my-form" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('form', 'my-form');
    });
  });

  describe('file input', () => {
    it('renders file input correctly', () => {
      render(<Input type="file" data-testid="file-input" />);
      const input = screen.getByTestId('file-input');
      expect(input).toHaveAttribute('type', 'file');
    });

    it('supports accept attribute for file input', () => {
      render(<Input type="file" accept=".pdf,.doc" data-testid="file-input" />);
      expect(screen.getByTestId('file-input')).toHaveAttribute('accept', '.pdf,.doc');
    });

    it('supports multiple files', () => {
      render(<Input type="file" multiple data-testid="file-input" />);
      expect(screen.getByTestId('file-input')).toHaveAttribute('multiple');
    });
  });
});

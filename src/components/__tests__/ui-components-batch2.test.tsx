import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// ─── Skeleton ────────────────────────────────────────────────────────────────

import { Skeleton } from '../ui/skeleton';

describe('Skeleton', () => {
  it('renders a div element', () => {
    const { container } = render(<Skeleton />);
    expect(container.firstChild).toBeInstanceOf(HTMLDivElement);
  });

  it('applies animate-pulse class', () => {
    const { container } = render(<Skeleton />);
    expect(container.firstChild).toHaveClass('animate-pulse');
  });

  it('applies rounded-md class', () => {
    const { container } = render(<Skeleton />);
    expect(container.firstChild).toHaveClass('rounded-md');
  });

  it('merges custom className', () => {
    const { container } = render(<Skeleton className="h-12 w-48" />);
    expect(container.firstChild).toHaveClass('h-12', 'w-48', 'animate-pulse');
  });

  it('passes through additional HTML attributes', () => {
    render(<Skeleton data-testid="skel" />);
    expect(screen.getByTestId('skel')).toBeInTheDocument();
  });
});

// ─── Separator ───────────────────────────────────────────────────────────────

import { Separator } from '../ui/separator';

describe('Separator', () => {
  it('renders with horizontal orientation by default', () => {
    const { container } = render(<Separator />);
    expect(container.firstChild).toHaveAttribute('data-orientation', 'horizontal');
  });

  it('applies horizontal dimension classes', () => {
    const { container } = render(<Separator />);
    expect(container.firstChild).toHaveClass('h-[1px]', 'w-full');
  });

  it('renders with vertical orientation', () => {
    const { container } = render(<Separator orientation="vertical" />);
    expect(container.firstChild).toHaveAttribute('data-orientation', 'vertical');
  });

  it('applies vertical dimension classes', () => {
    const { container } = render(<Separator orientation="vertical" />);
    expect(container.firstChild).toHaveClass('h-full', 'w-[1px]');
  });

  it('merges custom className', () => {
    const { container } = render(<Separator className="my-4" />);
    expect(container.firstChild).toHaveClass('my-4');
  });
});

// ─── Label ───────────────────────────────────────────────────────────────────

import { Label } from '../ui/label';

describe('Label', () => {
  it('renders label text', () => {
    render(<Label>Email</Label>);
    expect(screen.getByText('Email')).toBeInTheDocument();
  });

  it('applies base font classes', () => {
    const { container } = render(<Label>Name</Label>);
    expect(container.firstChild).toHaveClass('text-sm', 'font-medium');
  });

  it('associates with input via htmlFor', () => {
    render(<Label htmlFor="email-input">Email</Label>);
    const label = screen.getByText('Email');
    expect(label).toHaveAttribute('for', 'email-input');
  });

  it('merges custom className', () => {
    const { container } = render(<Label className="text-red-500">Error</Label>);
    expect(container.firstChild).toHaveClass('text-red-500');
  });
});

// ─── Progress ────────────────────────────────────────────────────────────────

import { Progress } from '../ui/progress';

describe('Progress', () => {
  it('renders with progressbar role', () => {
    render(<Progress value={50} />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('has default aria-label of "Progress"', () => {
    render(<Progress value={50} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-label', 'Progress');
  });

  it('accepts custom aria-label', () => {
    render(<Progress value={75} aria-label="Upload progress" />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-label', 'Upload progress');
  });

  it('merges custom className', () => {
    render(<Progress value={25} className="h-2" />);
    expect(screen.getByRole('progressbar')).toHaveClass('h-2');
  });

  it('applies base classes', () => {
    render(<Progress value={50} />);
    expect(screen.getByRole('progressbar')).toHaveClass('overflow-hidden', 'rounded-full');
  });
});

// ─── Checkbox ────────────────────────────────────────────────────────────────

import { Checkbox } from '../ui/checkbox';

describe('Checkbox', () => {
  it('renders as a checkbox', () => {
    render(<Checkbox />);
    expect(screen.getByRole('checkbox')).toBeInTheDocument();
  });

  it('is unchecked by default', () => {
    render(<Checkbox />);
    expect(screen.getByRole('checkbox')).not.toBeChecked();
  });

  it('can be checked by default', () => {
    render(<Checkbox defaultChecked />);
    expect(screen.getByRole('checkbox')).toBeChecked();
  });

  it('supports disabled state', () => {
    render(<Checkbox disabled />);
    expect(screen.getByRole('checkbox')).toBeDisabled();
  });

  it('merges custom className', () => {
    const { container } = render(<Checkbox className="border-red-500" />);
    const checkbox = container.querySelector('button');
    expect(checkbox).toHaveClass('border-red-500');
  });
});

// ─── Switch ──────────────────────────────────────────────────────────────────

import { Switch } from '../ui/switch';

describe('Switch', () => {
  it('renders as a switch', () => {
    render(<Switch />);
    expect(screen.getByRole('switch')).toBeInTheDocument();
  });

  it('is off by default', () => {
    render(<Switch />);
    expect(screen.getByRole('switch')).toHaveAttribute('data-state', 'unchecked');
  });

  it('can be on by default', () => {
    render(<Switch defaultChecked />);
    expect(screen.getByRole('switch')).toHaveAttribute('data-state', 'checked');
  });

  it('supports disabled state', () => {
    render(<Switch disabled />);
    expect(screen.getByRole('switch')).toBeDisabled();
  });

  it('calls onCheckedChange when toggled', () => {
    const onChange = vi.fn();
    render(<Switch onCheckedChange={onChange} />);
    fireEvent.click(screen.getByRole('switch'));
    expect(onChange).toHaveBeenCalledWith(true);
  });
});

// ─── Toggle ──────────────────────────────────────────────────────────────────

import { Toggle } from '../ui/toggle';

describe('Toggle', () => {
  it('renders children', () => {
    render(<Toggle>Bold</Toggle>);
    expect(screen.getByText('Bold')).toBeInTheDocument();
  });

  it('renders as a button', () => {
    render(<Toggle>B</Toggle>);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('applies default size classes', () => {
    const { container } = render(<Toggle>B</Toggle>);
    const btn = container.querySelector('button');
    expect(btn).toHaveClass('h-10', 'px-3');
  });

  it('applies sm size classes', () => {
    const { container } = render(<Toggle size="sm">B</Toggle>);
    const btn = container.querySelector('button');
    expect(btn).toHaveClass('h-9', 'px-2.5');
  });

  it('applies lg size classes', () => {
    const { container } = render(<Toggle size="lg">B</Toggle>);
    const btn = container.querySelector('button');
    expect(btn).toHaveClass('h-11', 'px-5');
  });

  it('applies outline variant', () => {
    const { container } = render(<Toggle variant="outline">B</Toggle>);
    const btn = container.querySelector('button');
    expect(btn).toHaveClass('border', 'border-input');
  });
});

// ─── Slider ──────────────────────────────────────────────────────────────────

import { Slider } from '../ui/slider';

describe('Slider', () => {
  it('renders as a slider', () => {
    render(<Slider defaultValue={[50]} />);
    expect(screen.getByRole('slider')).toBeInTheDocument();
  });

  it('sets aria-valuemin and max', () => {
    render(<Slider defaultValue={[50]} min={0} max={100} />);
    const slider = screen.getByRole('slider');
    expect(slider).toHaveAttribute('aria-valuemin', '0');
    expect(slider).toHaveAttribute('aria-valuemax', '100');
  });

  it('reflects the default value', () => {
    render(<Slider defaultValue={[75]} />);
    const slider = screen.getByRole('slider');
    expect(slider).toHaveAttribute('aria-valuenow', '75');
  });

  it('merges custom className', () => {
    const { container } = render(<Slider defaultValue={[50]} className="w-64" />);
    const root = container.querySelector('[class*="flex"]');
    expect(root).toHaveClass('w-64');
  });
});

// ─── GlassButton ─────────────────────────────────────────────────────────────

import { GlassButton } from '../ui/glass-button';

describe('GlassButton', () => {
  it('renders as a button', () => {
    render(<GlassButton>Click me</GlassButton>);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it('applies primary variant by default', () => {
    const { container } = render(<GlassButton>Primary</GlassButton>);
    const btn = container.querySelector('button');
    expect(btn).toHaveClass('from-orange-500');
  });

  it('applies secondary variant', () => {
    const { container } = render(<GlassButton variant="secondary">Second</GlassButton>);
    const btn = container.querySelector('button');
    expect(btn).toHaveClass('backdrop-blur-xl');
  });

  it('applies sm size', () => {
    const { container } = render(<GlassButton size="sm">Small</GlassButton>);
    const btn = container.querySelector('button');
    expect(btn).toHaveClass('h-10', 'px-4');
  });

  it('applies lg size', () => {
    const { container } = render(<GlassButton size="lg">Large</GlassButton>);
    const btn = container.querySelector('button');
    expect(btn).toHaveClass('h-14', 'px-8');
  });

  it('supports disabled state', () => {
    render(<GlassButton disabled>Disabled</GlassButton>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('fires click handler', () => {
    const onClick = vi.fn();
    render(<GlassButton onClick={onClick}>Click</GlassButton>);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

// ─── Input ───────────────────────────────────────────────────────────────────

import { Input } from '../ui/input';

describe('Input', () => {
  it('renders as a text input by default', () => {
    render(<Input />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('accepts and displays a value', () => {
    render(<Input defaultValue="hello" />);
    expect(screen.getByRole('textbox')).toHaveValue('hello');
  });

  it('shows error styling when error prop is true', () => {
    render(<Input error />);
    expect(screen.getByRole('textbox')).toHaveClass('border-destructive');
  });

  it('sets aria-invalid when error is true', () => {
    render(<Input error />);
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
  });

  it('shows success styling when success prop is true', () => {
    render(<Input success />);
    expect(screen.getByRole('textbox')).toHaveClass('border-green-500');
  });

  it('shows error message when provided', () => {
    render(<Input error errorMessage="Required field" />);
    expect(screen.getByText('Required field')).toBeInTheDocument();
  });

  it('does not show error message when no error', () => {
    render(<Input errorMessage="Required field" />);
    expect(screen.queryByText('Required field')).not.toBeInTheDocument();
  });

  it('supports disabled state', () => {
    render(<Input disabled />);
    expect(screen.getByRole('textbox')).toBeDisabled();
  });
});

// ─── Textarea ────────────────────────────────────────────────────────────────

import { Textarea } from '../ui/textarea';

describe('Textarea', () => {
  it('renders a textarea element', () => {
    render(<Textarea />);
    expect(screen.getByRole('textbox')).toBeInstanceOf(HTMLTextAreaElement);
  });

  it('accepts and displays a value', () => {
    render(<Textarea defaultValue="Some text" />);
    expect(screen.getByRole('textbox')).toHaveValue('Some text');
  });

  it('applies min-h-[80px] class', () => {
    render(<Textarea />);
    expect(screen.getByRole('textbox')).toHaveClass('min-h-[80px]');
  });

  it('merges custom className', () => {
    render(<Textarea className="h-32" />);
    expect(screen.getByRole('textbox')).toHaveClass('h-32');
  });

  it('supports disabled state', () => {
    render(<Textarea disabled />);
    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  it('supports placeholder', () => {
    render(<Textarea placeholder="Enter description" />);
    expect(screen.getByPlaceholderText('Enter description')).toBeInTheDocument();
  });
});

// ─── RadioGroup ──────────────────────────────────────────────────────────────

import { RadioGroup, RadioGroupItem } from '../ui/radio-group';

describe('RadioGroup', () => {
  it('renders radio items', () => {
    render(
      <RadioGroup defaultValue="a">
        <RadioGroupItem value="a" />
        <RadioGroupItem value="b" />
      </RadioGroup>
    );
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(2);
  });

  it('checks the default value item', () => {
    render(
      <RadioGroup defaultValue="b">
        <RadioGroupItem value="a" />
        <RadioGroupItem value="b" />
      </RadioGroup>
    );
    const radios = screen.getAllByRole('radio');
    expect(radios[0]).not.toBeChecked();
    expect(radios[1]).toBeChecked();
  });

  it('applies grid layout class', () => {
    const { container } = render(
      <RadioGroup defaultValue="a">
        <RadioGroupItem value="a" />
      </RadioGroup>
    );
    expect(container.firstChild).toHaveClass('grid', 'gap-2');
  });

  it('merges custom className on group', () => {
    const { container } = render(
      <RadioGroup defaultValue="a" className="space-y-4">
        <RadioGroupItem value="a" />
      </RadioGroup>
    );
    expect(container.firstChild).toHaveClass('space-y-4');
  });

  it('supports disabled items', () => {
    render(
      <RadioGroup defaultValue="a">
        <RadioGroupItem value="a" disabled />
      </RadioGroup>
    );
    expect(screen.getByRole('radio')).toBeDisabled();
  });
});

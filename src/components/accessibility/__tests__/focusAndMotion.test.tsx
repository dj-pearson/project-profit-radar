// US-221: visible focus on the interactive primitives, and prefers-reduced-motion
// honoured app-wide from CSS (not only after useAccessibility mounts).
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Toggle } from '@/components/ui/toggle';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectTrigger, SelectValue } from '@/components/ui/select';

// A primitive that removes the browser outline must put a ring back, or a
// keyboard user loses track of focus (WCAG 2.4.7).
function expectVisibleFocus(el: HTMLElement) {
  const cls = el.className;
  if (/(^|\s)(focus-visible:|focus:)?outline-none(\s|$)/.test(cls)) {
    expect(cls).toMatch(/focus-visible:ring-2|focus:ring-2/);
  }
}

describe('interactive primitives keep a visible focus indicator', () => {
  it('Button', () => {
    render(<Button>Save</Button>);
    expectVisibleFocus(screen.getByRole('button', { name: 'Save' }));
  });

  it('Input and Textarea', () => {
    render(
      <>
        <Input aria-label="Name" />
        <Textarea aria-label="Notes" />
      </>,
    );
    expectVisibleFocus(screen.getByRole('textbox', { name: 'Name' }));
    expectVisibleFocus(screen.getByRole('textbox', { name: 'Notes' }));
  });

  it('Checkbox, Switch and Toggle', () => {
    render(
      <>
        <Checkbox aria-label="Agree" />
        <Switch aria-label="Enabled" />
        <Toggle aria-label="Bold">B</Toggle>
      </>,
    );
    expectVisibleFocus(screen.getByRole('checkbox', { name: 'Agree' }));
    expectVisibleFocus(screen.getByRole('switch', { name: 'Enabled' }));
    expectVisibleFocus(screen.getByRole('button', { name: 'Bold' }));
  });

  it('TabsTrigger and RadioGroupItem', () => {
    render(
      <>
        <Tabs defaultValue="a">
          <TabsList>
            <TabsTrigger value="a">Overview</TabsTrigger>
          </TabsList>
        </Tabs>
        <RadioGroup aria-label="Size">
          <RadioGroupItem value="s" aria-label="Small" />
        </RadioGroup>
      </>,
    );
    expectVisibleFocus(screen.getByRole('tab', { name: 'Overview' }));
    expectVisibleFocus(screen.getByRole('radio', { name: 'Small' }));
  });

  it('SelectTrigger', () => {
    render(
      <Select>
        <SelectTrigger aria-label="Status">
          <SelectValue placeholder="Any" />
        </SelectTrigger>
      </Select>,
    );
    expectVisibleFocus(screen.getByRole('combobox', { name: 'Status' }));
  });
});

describe('global CSS', () => {
  const css = readFileSync(join(process.cwd(), 'src', 'index.css'), 'utf8');

  it('draws a focus-visible outline on every element by default', () => {
    expect(css).toMatch(/\*:focus-visible\s*\{[^}]*outline:\s*2px solid/);
  });

  it('cuts animation and transition time under prefers-reduced-motion without waiting for JS', () => {
    const block = css.match(
      /@media \(prefers-reduced-motion: reduce\)\s*\{\s*\*,\s*\*::before,\s*\*::after\s*\{([^}]*)\}/,
    );
    expect(block).not.toBeNull();
    expect(block?.[1]).toMatch(/animation-duration:\s*0\.01ms !important/);
    expect(block?.[1]).toMatch(/transition-duration:\s*0\.01ms !important/);
    expect(block?.[1]).toMatch(/scroll-behavior:\s*auto !important/);
  });
});

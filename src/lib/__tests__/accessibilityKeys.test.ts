import { describe, it, expect, vi } from 'vitest';
import { activateOnKey, closeOnEscape } from '../accessibility';

const key = (k: string, nested = false) => {
  const target = {};
  return { key: k, target, currentTarget: nested ? {} : target, preventDefault: vi.fn() };
};

describe('activateOnKey', () => {
  it('runs the handler on Enter and Space, like a native button', () => {
    const fn = vi.fn();
    const onKeyDown = activateOnKey(fn);
    const enter = key('Enter');
    onKeyDown(enter);
    onKeyDown(key(' '));
    expect(fn).toHaveBeenCalledTimes(2);
    expect(enter.preventDefault).toHaveBeenCalled();
  });

  it('ignores other keys and keys aimed at a nested control', () => {
    const fn = vi.fn();
    const onKeyDown = activateOnKey(fn);
    onKeyDown(key('a'));
    onKeyDown(key('Enter', true));
    expect(fn).not.toHaveBeenCalled();
  });
});

describe('closeOnEscape', () => {
  it('closes on Escape only', () => {
    const fn = vi.fn();
    const onKeyDown = closeOnEscape(fn);
    onKeyDown(key('Enter'));
    onKeyDown(key('Escape', true));
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

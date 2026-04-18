import { useEffect } from 'react';

/**
 * iOS Safari virtual-keyboard avoidance — scrolls the focused input
 * into view above the keyboard. Runs on focusin/focusout and on
 * viewport resize (iOS fires this when the keyboard shows).
 *
 * Call once at the form root. Disabled on non-touch / desktop to
 * avoid jumpy scroll.
 */
export function useKeyboardAwareScroll(enabled = true) {
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;
    const vv = window.visualViewport;

    const scrollIntoView = (el: HTMLElement) => {
      const rect = el.getBoundingClientRect();
      const vh = vv?.height ?? window.innerHeight;
      // Leave 16px breathing room above the keyboard
      if (rect.bottom > vh - 16) {
        el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    };

    const onFocusIn = (e: Event) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      if (
        t.tagName === 'INPUT' ||
        t.tagName === 'TEXTAREA' ||
        t.tagName === 'SELECT'
      ) {
        // Delay past the keyboard's slide-in animation
        window.setTimeout(() => scrollIntoView(t), 250);
      }
    };

    const onResize = () => {
      const active = document.activeElement as HTMLElement | null;
      if (!active) return;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(active.tagName)) {
        scrollIntoView(active);
      }
    };

    document.addEventListener('focusin', onFocusIn);
    vv?.addEventListener('resize', onResize);

    return () => {
      document.removeEventListener('focusin', onFocusIn);
      vv?.removeEventListener('resize', onResize);
    };
  }, [enabled]);
}

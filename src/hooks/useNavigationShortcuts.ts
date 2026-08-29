import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

/**
 * Power-user keyboard shortcuts (US-095):
 *  - Shift+?  -> open the shortcuts overlay (dispatches 'showShortcutsHelp')
 *  - G then P/I/T/D -> navigate to Projects / Invoices / Time / Dashboard (chord)
 *  - N -> create a new item in the CURRENT context (project on /projects, etc.)
 *  - Escape -> handled natively by the open Dialog/Sheet (Radix)
 *
 * All shortcuts are disabled while the user is typing in an input, textarea,
 * select, or contenteditable element, and ignore Ctrl/Cmd/Alt chords so they
 * never clash with browser or OS shortcuts.
 */

const G_CHORD_WINDOW_MS = 1500;

const G_NAV_TARGETS: Record<string, string> = {
  p: '/projects',
  i: '/invoices',
  t: '/time-tracking',
  d: '/dashboard',
};

// Context-aware "New" destinations, matched against the current pathname.
const NEW_TARGETS: { match: RegExp; to: string }[] = [
  { match: /^\/projects/, to: '/create-project' },
  { match: /^\/invoices/, to: '/invoices/new' },
  { match: /^\/(time-tracking|time)/, to: '/time-tracking' },
  { match: /^\/expenses/, to: '/expenses' },
  { match: /^\/(crm|contacts)/, to: '/crm' },
  { match: /^\/reports\/daily/, to: '/daily-reports' },
];

export function isEditableTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el || !el.tagName) return false;
  const tag = el.tagName.toUpperCase();
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable === true;
}

export function resolveNewTarget(pathname: string): string | null {
  return NEW_TARGETS.find((t) => t.match.test(pathname))?.to ?? null;
}

export function useNavigationShortcuts(): void {
  const navigate = useNavigate();
  const location = useLocation();
  const gTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gPending = useRef(false);

  useEffect(() => {
    const clearG = () => {
      gPending.current = false;
      if (gTimer.current) {
        clearTimeout(gTimer.current);
        gTimer.current = null;
      }
    };

    const handler = (e: KeyboardEvent) => {
      if (!e.key) return;
      if (isEditableTarget(e.target)) return; // never hijack typing

      // Shift+? opens the overlay (works regardless of the chord state).
      if (e.key === '?') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('showShortcutsHelp'));
        return;
      }

      // Leave Ctrl/Cmd/Alt combos to the browser/other handlers.
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const key = e.key.toLowerCase();

      // Second key of a G-chord.
      if (gPending.current) {
        clearG();
        const dest = G_NAV_TARGETS[key];
        if (dest) {
          e.preventDefault();
          navigate(dest);
        }
        return;
      }

      // First key of a G-chord.
      if (key === 'g') {
        gPending.current = true;
        gTimer.current = setTimeout(clearG, G_CHORD_WINDOW_MS);
        return;
      }

      // N -> context-aware new item.
      if (key === 'n') {
        const dest = resolveNewTarget(location.pathname);
        if (dest) {
          e.preventDefault();
          navigate(dest);
        }
      }
    };

    document.addEventListener('keydown', handler);
    return () => {
      document.removeEventListener('keydown', handler);
      clearG();
    };
  }, [navigate, location.pathname]);
}

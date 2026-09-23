import { useEffect, useRef, useState } from 'react';

/**
 * Cloudflare Turnstile for the public lead forms (US-351).
 *
 * Renders nothing when VITE_TURNSTILE_SITE_KEY is unset, and the forms then
 * submit without a token; the edge functions only require one once
 * TURNSTILE_SECRET_KEY is set. Ship the site key before the secret.
 */

const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

interface TurnstileApi {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  remove: (id: string) => void;
  reset: (id: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

export const turnstileSiteKey = (): string | undefined =>
  (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined) || undefined;

let loading: Promise<TurnstileApi> | null = null;

function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    // Allowed by the Trusted Types default policy in index.html and by
    // script-src / frame-src in public/_headers.
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error('Turnstile did not load')));
    script.onerror = () => {
      loading = null;
      reject(new Error('Turnstile did not load'));
    };
    document.head.appendChild(script);
  });
  return loading;
}

/**
 * Token state for a form. `ready` is true when no site key is configured
 * (nothing to wait for) or once the widget has produced a token.
 */
export function useTurnstileToken() {
  const [token, setToken] = useState<string | null>(null);
  const enabled = Boolean(turnstileSiteKey());
  return { token, setToken, enabled, ready: !enabled || Boolean(token) };
}

interface TurnstileProps {
  onToken: (token: string | null) => void;
  className?: string;
}

export function Turnstile({ onToken, className }: TurnstileProps) {
  const siteKey = turnstileSiteKey();
  const ref = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!siteKey || !ref.current) return;
    let widgetId: string | null = null;
    let cancelled = false;
    loadTurnstile()
      .then((api) => {
        if (cancelled || !ref.current) return;
        widgetId = api.render(ref.current, {
          sitekey: siteKey,
          callback: (t: string) => onToken(t),
          'expired-callback': () => onToken(null),
          'error-callback': () => onToken(null),
        });
      })
      .catch(() => setFailed(true));
    return () => {
      cancelled = true;
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
    };
    // onToken is a state setter at every call site.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteKey]);

  if (!siteKey) return null;
  return (
    <div className={className}>
      <div ref={ref} />
      {failed && (
        <p role="alert" className="text-sm text-destructive">
          The verification check could not load. Check your connection or disable content blockers, then reload.
        </p>
      )}
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Cookie, Settings, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  acceptAllConsent,
  getEffectiveConsent,
  hasUserDecided,
  isGlobalPrivacyControlActive,
  OPEN_PREFERENCES_EVENT,
  rejectAllConsent,
  setConsent,
  subscribeToConsent,
  type ConsentState,
} from '@/lib/consent/consentStore';

/**
 * CookieConsentBanner
 *
 * User-facing cookie banner that:
 *   - Appears on first visit until the user makes a choice (GDPR/ePrivacy).
 *   - Provides "Accept All", "Reject All", and granular "Customize" controls
 *     with equal prominence (no dark patterns).
 *   - Honors Global Privacy Control on mount: if GPC is active, persists a
 *     reject-all consent automatically and does not show the banner (CCPA/
 *     CPRA, Colorado, Connecticut, Texas, Virginia).
 *   - Listens for `brikly:open-cookie-preferences` so any in-app link
 *     (e.g., footer "Cookie Preferences") can re-open it.
 *
 * Mounted globally in App.tsx so it appears on every public page. The richer
 * admin-style management UI in CookieConsentManager.tsx is unchanged.
 */
const CookieConsentBanner: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [draft, setDraft] = useState<ConsentState>(getEffectiveConsent);

  // Decide whether to show the banner on mount. We intentionally do not
  // pre-load analytics scripts before this runs — they wait on consent state.
  useEffect(() => {
    // Honor GPC even when the user has never opened the page: persist a
    // reject-all record so downstream code never enables analytics.
    if (isGlobalPrivacyControlActive() && !hasUserDecided()) {
      setConsent(
        { essential: true, analytics: false, marketing: false, preferences: false },
        'gpc',
      );
      return;
    }
    if (!hasUserDecided()) setOpen(true);
  }, []);

  // Allow other code (Footer link, in-app settings) to re-open the banner.
  useEffect(() => {
    const handler = () => {
      setDraft(getEffectiveConsent());
      setOpen(true);
      setShowCustomize(false);
    };
    window.addEventListener(OPEN_PREFERENCES_EVENT, handler);
    return () => window.removeEventListener(OPEN_PREFERENCES_EVENT, handler);
  }, []);

  // Keep draft in sync if consent changes elsewhere (e.g., reset).
  useEffect(() => subscribeToConsent((record) => {
    if (record) setDraft(record.state);
  }), []);

  const handleAcceptAll = () => {
    acceptAllConsent();
    setOpen(false);
    setShowCustomize(false);
  };

  const handleRejectAll = () => {
    rejectAllConsent();
    setOpen(false);
    setShowCustomize(false);
  };

  const handleSave = () => {
    setConsent(draft, 'preferences');
    setOpen(false);
    setShowCustomize(false);
  };

  if (!open) return null;

  return (
    <>
      {/* Bottom banner — present only until the user makes a choice. */}
      {!showCustomize && (
        <div
          role="dialog"
          aria-modal="false"
          aria-labelledby="cookie-banner-title"
          aria-describedby="cookie-banner-body"
          className="fixed bottom-0 inset-x-0 z-[100] p-4 sm:p-6 pointer-events-none"
        >
          <div className="pointer-events-auto max-w-4xl mx-auto rounded-lg border bg-background shadow-lg p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <Cookie className="h-5 w-5 mt-0.5 text-primary" aria-hidden="true" />
              <div className="flex-1 min-w-0">
                <h2 id="cookie-banner-title" className="font-semibold text-base">
                  We value your privacy
                </h2>
                <p
                  id="cookie-banner-body"
                  className="text-sm text-muted-foreground mt-1"
                >
                  We use essential cookies to run our site and, with your
                  permission, optional cookies for analytics and marketing.
                  See our{' '}
                  <Link to="/cookie-policy" className="underline">
                    Cookie Policy
                  </Link>{' '}
                  and{' '}
                  <Link to="/privacy-policy" className="underline">
                    Privacy Policy
                  </Link>
                  . You can change your choice anytime via "Cookie
                  Preferences" in the footer.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {/* Equal-prominence buttons — no dark patterns. */}
                  <Button size="sm" onClick={handleAcceptAll}>
                    Accept all
                  </Button>
                  <Button size="sm" variant="secondary" onClick={handleRejectAll}>
                    Reject all
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowCustomize(true)}
                  >
                    <Settings className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
                    Customize
                  </Button>
                </div>
              </div>
              <button
                type="button"
                aria-label="Close — choose later (essential cookies only)"
                onClick={handleRejectAll}
                className="text-muted-foreground hover:text-foreground p-1"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Granular preferences dialog */}
      <Dialog open={showCustomize} onOpenChange={setShowCustomize}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Cookie preferences</DialogTitle>
            <DialogDescription>
              Toggle the categories you allow. Essential cookies are required
              for the site to function and cannot be disabled.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <CategoryRow
              title="Essential"
              description="Authentication, session, security, and consent state. Cannot be disabled."
              checked
              disabled
            />
            <CategoryRow
              title="Analytics"
              description="Aggregate, pseudonymous usage data so we can improve the product (PostHog, Google Analytics)."
              checked={draft.analytics}
              onChange={(v) => setDraft({ ...draft, analytics: v })}
            />
            <CategoryRow
              title="Marketing"
              description="Measure and personalize advertising on third-party platforms."
              checked={draft.marketing}
              onChange={(v) => setDraft({ ...draft, marketing: v })}
            />
            <CategoryRow
              title="Preferences"
              description="Remember UI choices like theme and language."
              checked={draft.preferences}
              onChange={(v) => setDraft({ ...draft, preferences: v })}
            />
          </div>

          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={handleRejectAll}>
              Reject all
            </Button>
            <Button variant="outline" onClick={handleAcceptAll}>
              Accept all
            </Button>
            <Button onClick={handleSave}>Save preferences</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

interface CategoryRowProps {
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: (value: boolean) => void;
}

const CategoryRow: React.FC<CategoryRowProps> = ({
  title,
  description,
  checked,
  disabled,
  onChange,
}) => (
  <div className="flex items-start justify-between gap-4">
    <div>
      <p className="font-medium text-sm">{title}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
    <Switch
      checked={checked}
      disabled={disabled}
      onCheckedChange={onChange}
      aria-label={`${title} cookies`}
    />
  </div>
);

export default CookieConsentBanner;

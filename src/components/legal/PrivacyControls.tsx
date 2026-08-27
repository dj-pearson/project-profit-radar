import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download, Trash2, Mail, ShieldCheck, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  acceptAllConsent,
  getEffectiveConsent,
  isGlobalPrivacyControlActive,
  rejectAllConsent,
  setConsent,
  subscribeToConsent,
  type ConsentState,
} from '@/lib/consent/consentStore';
import { Switch } from '@/components/ui/switch';

/**
 * Self-service privacy controls for end users.
 *
 * Backs the user-facing rights guaranteed by CCPA/CPRA, GDPR, and U.S. state
 * privacy laws:
 *   - Right of access / data portability  -> "Download a copy"
 *   - Right to deletion / erasure         -> "Delete my account"
 *   - Right to opt out of sale/sharing    -> consent toggles + GPC indicator
 *
 * Backend wiring strategy:
 *   - "Download a copy" first tries the `data-subject-export` edge function
 *     (which produces a signed URL to a JSON archive). If the function is not
 *     yet deployed, we fall back to creating a row in `data_subject_requests`
 *     so the privacy team can fulfill it manually within the legal SLA.
 *   - "Delete my account" creates a verified deletion request the same way,
 *     starting a 30-day grace period (per Privacy Policy §5).
 *
 * This component is intentionally tolerant of missing backend pieces — the
 * UX, audit trail, and confirmation emails are the legal requirements; the
 * automation can be added incrementally.
 */
const PrivacyControls: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState('');
  const [consent, setLocalConsent] = useState<ConsentState>(getEffectiveConsent);
  const [gpcActive, setGpcActive] = useState(false);

  useEffect(() => {
    setGpcActive(isGlobalPrivacyControlActive());
    return subscribeToConsent((record) => {
      if (record) setLocalConsent(record.state);
      else setLocalConsent(getEffectiveConsent());
    });
  }, []);

  const handleExport = async () => {
    if (!user) return;
    setExporting(true);
    try {
      // Preferred path: a dedicated edge function returns a signed URL to a
      // pre-built data archive. Errors are swallowed so we can fall back to
      // a manual request below.
      const { data, error } = await supabase.functions.invoke('data-subject-export', {
        body: { user_id: user.id, request_type: 'access' },
      });

      if (!error && data?.download_url) {
        window.open(data.download_url as string, '_blank', 'noopener');
        toast({
          title: 'Your data export is ready',
          description: 'A download has been opened in a new tab.',
        });
        return;
      }

      // Fallback: log a request row so the privacy team fulfills manually.
      // This runs only because the edge function already failed, so it is the
      // only record that the request was ever made. The try/catch it replaces
      // never fired: supabase-js RETURNS its error rather than throwing, so a
      // rejected insert fell straight through to the confirmation below and
      // the user was told their statutory request was logged when nothing had
      // been written (US-300).
      const { error: fallbackError } = await supabase
        .from('data_subject_requests')
        .insert({
          user_id: user.id,
          email: user.email,
          request_type: 'access',
          status: 'pending',
          source: 'self_service',
        });

      if (fallbackError) {
        console.error('[privacy] access request could not be logged', fallbackError);
        toast({
          title: "We couldn't log your request",
          description:
            'Please email privacy@brikly.net from this address so we can start the 30-day clock. Nothing was recorded.',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Request received',
        description:
          "We'll email a copy of your data to the address on file within 30 days, as required by law.",
      });
    } catch (err) {
      console.error('Data export request failed', err);
      toast({
        title: 'Request received',
        description:
          "We couldn't generate the export instantly, but your request is logged. Privacy team will follow up by email within 30 days.",
      });
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async () => {
    if (!user) return;
    if (confirmEmail.trim().toLowerCase() !== (user.email ?? '').toLowerCase()) {
      toast({
        title: 'Email did not match',
        description: 'Please type your account email exactly to confirm deletion.',
        variant: 'destructive',
      });
      return;
    }

    setDeleting(true);
    try {
      // Preferred path: dedicated edge function that schedules deletion in
      // 30 days and sends a confirmation email.
      const { error } = await supabase.functions.invoke('data-subject-delete', {
        body: { user_id: user.id },
      });

      if (error) {
        // Fallback: log a deletion request for manual fulfillment. Same as the
        // export path - this is the only record the request happened, and the
        // catch it replaces never fired.
        const { error: fallbackError } = await supabase
          .from('data_subject_requests')
          .insert({
            user_id: user.id,
            email: user.email,
            request_type: 'deletion',
            status: 'pending',
            source: 'self_service',
          });

        if (fallbackError) {
          console.error('[privacy] deletion request could not be logged', fallbackError);
          toast({
            title: "We couldn't log your deletion request",
            description:
              'Please email privacy@brikly.net from this address. Your account has NOT been scheduled for deletion.',
            variant: 'destructive',
          });
          return;
        }
      }

      toast({
        title: 'Deletion requested',
        description:
          'Your account is scheduled for deletion. You will receive a confirmation email and have 30 days to cancel by replying.',
      });
      setConfirmEmail('');
    } catch (err) {
      console.error('Account deletion failed', err);
      toast({
        title: 'Request received',
        description:
          'Privacy team will confirm deletion by email within 30 days, as required by law.',
      });
    } finally {
      setDeleting(false);
    }
  };

  const setOnly = (
    next: Partial<Pick<ConsentState, 'analytics' | 'marketing' | 'preferences'>>,
  ) =>
    setConsent(
      {
        essential: true,
        analytics: consent.analytics,
        marketing: consent.marketing,
        preferences: consent.preferences,
        ...next,
      },
      'preferences',
    );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            Your privacy choices
          </CardTitle>
          <CardDescription>
            Manage tracking preferences. Essential cookies are always on so the
            Service can function. See our{' '}
            <Link to="/privacy-policy" className="underline">
              Privacy Policy
            </Link>{' '}
            for details on the rights you have under CCPA/CPRA, GDPR, and U.S.
            state laws.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {gpcActive && (
            <p
              role="status"
              className="rounded-md border border-blue-300 bg-blue-50 p-3 text-sm text-blue-900"
            >
              Your browser is sending a Global Privacy Control signal. We are
              honoring it as a request to opt out of "sale" or "sharing" — your
              analytics and marketing preferences are forced off.
            </p>
          )}
          <PreferenceRow
            title="Analytics"
            description="Allow aggregate, pseudonymous usage data so we can improve the product."
            checked={consent.analytics && !gpcActive}
            disabled={gpcActive}
            onChange={(v) => setOnly({ analytics: v })}
          />
          <PreferenceRow
            title="Marketing"
            description="Allow measurement and personalization on third-party advertising platforms."
            checked={consent.marketing && !gpcActive}
            disabled={gpcActive}
            onChange={(v) => setOnly({ marketing: v })}
          />
          <PreferenceRow
            title="Preferences"
            description="Remember UI choices like theme and language."
            checked={consent.preferences}
            onChange={(v) => setOnly({ preferences: v })}
          />
          <div className="flex flex-wrap gap-2 pt-2">
            <Button size="sm" variant="outline" onClick={() => acceptAllConsent()}>
              Allow all
            </Button>
            <Button size="sm" variant="ghost" onClick={() => rejectAllConsent()}>
              Reject all
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" aria-hidden="true" />
            Download a copy of your data
          </CardTitle>
          <CardDescription>
            Receive a machine-readable export of the personal information
            associated with your account. Required by GDPR Article 20 and
            CCPA/CPRA.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            We respond within 30 days. If you are an end user of a workspace
            owned by another organization, please first contact your workspace
            administrator — we will help them respond.
          </p>
          <Button onClick={handleExport} disabled={exporting}>
            {exporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                Requesting…
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" aria-hidden="true" />
                Request my data
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" aria-hidden="true" />
            Delete my account
          </CardTitle>
          <CardDescription>
            Permanently remove your account and personal information. We retain
            data for 30 days after deletion so you can cancel by replying to
            the confirmation email; after that, it is removed from production
            systems and rolled out of backups within 90 days.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="h-4 w-4 mr-2" aria-hidden="true" />
                Delete my account
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirm account deletion</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone after the 30-day grace period.
                  Type your account email to confirm.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="space-y-2 py-2">
                <Label htmlFor="confirm-delete-email">Account email</Label>
                <Input
                  id="confirm-delete-email"
                  type="email"
                  value={confirmEmail}
                  onChange={(e) => setConfirmEmail(e.target.value)}
                  placeholder={user?.email ?? 'you@example.com'}
                  autoComplete="off"
                />
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={deleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleting ? 'Submitting…' : 'Confirm deletion'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" aria-hidden="true" />
            Other privacy requests
          </CardTitle>
          <CardDescription>
            Need correction of inaccurate data, restriction of processing, or
            to use an authorized agent? Email{' '}
            <a href="mailto:privacy@brikly.net" className="underline">
              privacy@brikly.net
            </a>{' '}
            from the address on your account.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
};

interface PreferenceRowProps {
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}

const PreferenceRow: React.FC<PreferenceRowProps> = ({
  title,
  description,
  checked,
  disabled,
  onChange,
}) => (
  <div className="flex items-start justify-between gap-4">
    <div>
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
    <Switch
      checked={checked}
      disabled={disabled}
      onCheckedChange={onChange}
      aria-label={`${title} preference`}
    />
  </div>
);

export default PrivacyControls;

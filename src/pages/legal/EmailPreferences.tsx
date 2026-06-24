import React, { useEffect, useState } from 'react';
import { Mail, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import LegalPageLayout from '@/components/legal/LegalPageLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';

interface EmailPrefs {
  transactional: true; // always true — cannot be disabled
  product_updates: boolean;
  marketing: boolean;
  newsletter: boolean;
  security_alerts: true; // always true — required for account security
}

/**
 * Email Preferences.
 *
 * Public-reachable page for honoring CAN-SPAM opt-out within 10 business
 * days, TCPA unsubscribe obligations for SMS (if enabled), and GDPR /
 * ePrivacy withdrawal of consent.
 *
 * Reads/writes the authenticated user's `email_preferences` row if they are
 * signed in. When they arrive via an unsubscribe link without a session,
 * we surface a "sign in to manage" prompt and a fallback email-based
 * unsubscribe workflow.
 *
 * The URL `/email-preferences` is referenced from every outgoing Brikly
 * email's footer. Never rename it without updating:
 *   - src/templates/emails/baseEmailTemplate.ts
 *   - supabase/functions/_shared/auth-email-templates.ts
 *   - downstream edge functions that send email (see: send-* directories).
 */
const EmailPreferences = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState<EmailPrefs>({
    transactional: true,
    product_updates: true,
    marketing: true,
    newsletter: true,
    security_alerts: true,
  });

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const { data } = await supabase
          .from('email_preferences')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
        if (data) {
          setPrefs((p) => ({
            ...p,
            product_updates: data.product_updates ?? true,
            marketing: data.marketing ?? true,
            newsletter: data.newsletter ?? true,
          }));
        }
      } catch {
        /* fall through to defaults */
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const save = async (next: EmailPrefs) => {
    if (!user) {
      toast({
        title: 'Sign in to save preferences',
        description:
          'To save changes, sign in. You can also email unsubscribe@brikly.net from the address on your account and we will honor the request within 10 business days.',
      });
      return;
    }
    setSaving(true);
    try {
      await supabase.from('email_preferences').upsert({
        user_id: user.id,
        product_updates: next.product_updates,
        marketing: next.marketing,
        newsletter: next.newsletter,
        updated_at: new Date().toISOString(),
      });
      toast({ title: 'Preferences saved' });
    } catch (err) {
      console.error(err);
      toast({
        title: 'Could not save',
        description: 'Try again or email unsubscribe@brikly.net.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const toggle = <K extends keyof EmailPrefs>(key: K, value: EmailPrefs[K]) => {
    const next = { ...prefs, [key]: value } as EmailPrefs;
    setPrefs(next);
    save(next);
  };

  const unsubscribeAll = () => {
    const next: EmailPrefs = {
      ...prefs,
      product_updates: false,
      marketing: false,
      newsletter: false,
    };
    setPrefs(next);
    save(next);
  };

  return (
    <LegalPageLayout
      title="Email Preferences"
      metaDescription="Manage which emails Brikly sends you. Unsubscribe from marketing and product updates at any time."
      icon={<Mail className="h-5 w-5 text-primary" aria-hidden="true" />}
      relatedLinks={[
        { label: 'Privacy Policy', href: '/privacy-policy' },
        { label: 'Your Privacy Choices', href: '/do-not-sell' },
        { label: 'Contact support', href: 'mailto:support@brikly.net' },
      ]}
    >
      <p>
        Choose which emails you want to receive. Transactional and security
        emails are required to operate your account and cannot be turned off.
      </p>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 not-prose">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Loading your preferences…
        </div>
      ) : (
        <div className="space-y-5 not-prose mt-4">
          <PrefRow
            title="Transactional"
            description="Receipts, password resets, OTPs, deletion confirmations, and other emails required to operate your account."
            checked
            disabled
          />
          <PrefRow
            title="Security alerts"
            description="New device sign-ins, suspicious activity, MFA changes."
            checked
            disabled
          />
          <Separator />
          <PrefRow
            title="Product updates"
            description="Feature releases, platform-wide improvements, maintenance announcements relevant to your role."
            checked={prefs.product_updates}
            onChange={(v) => toggle('product_updates', v)}
          />
          <PrefRow
            title="Newsletter"
            description="Monthly digest with tips, customer stories, and industry articles."
            checked={prefs.newsletter}
            onChange={(v) => toggle('newsletter', v)}
          />
          <PrefRow
            title="Marketing"
            description="Webinars, promotional offers, and campaigns from Brikly."
            checked={prefs.marketing}
            onChange={(v) => toggle('marketing', v)}
          />

          <div className="flex flex-wrap gap-2 pt-2">
            <Button variant="outline" onClick={unsubscribeAll} disabled={saving}>
              Unsubscribe from everything except transactional
            </Button>
          </div>
        </div>
      )}

      {!user && (
        <p className="mt-6 text-sm text-muted-foreground">
          Not signed in?{' '}
          <Link to="/auth" className="underline">
            Sign in
          </Link>{' '}
          to save changes, or email{' '}
          <a href="mailto:unsubscribe@brikly.net" className="underline">
            unsubscribe@brikly.net
          </a>{' '}
          from the address on your account.
        </p>
      )}

      <h2 className="mt-10">Your rights</h2>
      <p>
        Under CAN-SPAM, Brikly will honor unsubscribe requests within 10
        business days. Under CASL (Canada) and ePrivacy (EU/UK), marketing
        email to your address is paused immediately upon your request. For
        broader privacy rights (data access, deletion, correction, opt-out of
        sale/share), see{' '}
        <Link to="/do-not-sell">Your Privacy Choices</Link> and{' '}
        <Link to="/privacy-policy">Privacy Policy</Link>.
      </p>
    </LegalPageLayout>
  );
};

interface PrefRowProps {
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: (v: boolean) => void;
}

const PrefRow: React.FC<PrefRowProps> = ({
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
      aria-label={`${title} emails`}
    />
  </div>
);

export default EmailPreferences;

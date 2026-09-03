/**
 * Everything one customer has (US-326).
 *
 * The question "what have we done for this person" had no answer: they existed
 * as a CRM contact, free text on estimates, free text on projects and an email
 * on their portal access, with no key between any of them. This reads the
 * customer_activity view, so this page and any future report agree on what
 * counts.
 */
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import { Mail, Phone, FileText, Building2, Receipt, KeyRound } from 'lucide-react';

interface Contact {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  mobile_phone: string | null;
  company_name: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
}

interface ActivityRow {
  record_type: 'estimate' | 'project' | 'invoice' | 'portal_access';
  record_id: string;
  reference: string | null;
  title: string | null;
  status: string | null;
  amount: number | null;
  occurred_at: string;
}

const money = (n: number | null) =>
  n == null ? '' : n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

const ICONS = {
  estimate: FileText,
  project: Building2,
  invoice: Receipt,
  portal_access: KeyRound,
} as const;

const LABELS = {
  estimate: 'Estimate',
  project: 'Project',
  invoice: 'Invoice',
  portal_access: 'Portal access',
} as const;

const ROUTES: Record<ActivityRow['record_type'], (id: string) => string | null> = {
  estimate: () => '/estimates',
  project: (id) => `/projects/${id}`,
  invoice: () => '/invoices',
  portal_access: () => null,
};

export default function CustomerDetail() {
  const { contactId } = useParams<{ contactId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [contact, setContact] = useState<Contact | null>(null);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!contactId) return;
    setLoading(true);

    const [{ data: contactRow, error: contactError }, { data: rows, error: activityError }] =
      await Promise.all([
        supabase
          .from('contacts')
          .select('id, first_name, last_name, email, phone, mobile_phone, company_name, address, city, state')
          .eq('id', contactId)
          .maybeSingle(),
        supabase
          .from('customer_activity')
          .select('record_type, record_id, reference, title, status, amount, occurred_at')
          .eq('client_id', contactId)
          .order('occurred_at', { ascending: false }),
      ]);

    if (contactError || activityError) {
      logger.error('Could not load the customer', contactError || activityError);
      toast({
        variant: 'destructive',
        title: 'Could not load this customer',
        description: (contactError || activityError)?.message,
      });
    }

    setContact(contactRow as Contact | null);
    setActivity((rows || []) as ActivityRow[]);
    setLoading(false);
  }, [contactId, toast]);

  useEffect(() => { void load(); }, [load]);

  const name = contact
    ? [contact.first_name, contact.last_name].filter(Boolean).join(' ').trim()
      || contact.company_name
      || contact.email
      || 'Customer'
    : 'Customer';

  return (
    <DashboardLayout title={name}>
      <div className="space-y-6">
        {loading ? (
          <>
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-64 w-full" />
          </>
        ) : !contact ? (
          <Card>
            <CardHeader>
              <CardTitle>Customer not found</CardTitle>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={() => navigate('/crm/contacts')}>
                Back to contacts
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle>{name}</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                {contact.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    <a className="underline" href={`mailto:${contact.email}`}>{contact.email}</a>
                  </div>
                )}
                {(contact.phone || contact.mobile_phone) && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    <span>{contact.phone || contact.mobile_phone}</span>
                  </div>
                )}
                {contact.company_name && (
                  <div className="text-muted-foreground">{contact.company_name}</div>
                )}
                {(contact.address || contact.city) && (
                  <div className="text-muted-foreground">
                    {[contact.address, contact.city, contact.state].filter(Boolean).join(', ')}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Everything for this customer</CardTitle>
              </CardHeader>
              <CardContent>
                {activity.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nothing is linked to this customer yet. Estimates, projects and invoices
                    appear here once they name them.
                  </p>
                ) : (
                  <ul className="divide-y">
                    {activity.map((row) => {
                      const Icon = ICONS[row.record_type];
                      const to = ROUTES[row.record_type](row.record_id);
                      return (
                        <li
                          key={`${row.record_type}-${row.record_id}`}
                          className="flex flex-wrap items-center justify-between gap-3 py-3"
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <Icon className="h-4 w-4 mt-1 text-muted-foreground" aria-hidden="true" />
                            <div className="min-w-0">
                              <p className="font-medium truncate">
                                {row.title || row.reference || LABELS[row.record_type]}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {LABELS[row.record_type]}
                                {row.reference ? ` ${row.reference}` : ''}
                                {' · '}
                                {new Date(row.occurred_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {row.amount != null && (
                              <span className="text-sm font-medium">{money(row.amount)}</span>
                            )}
                            {row.status && <Badge variant="outline">{row.status}</Badge>}
                            {to && (
                              <Button variant="ghost" size="sm" onClick={() => navigate(to)}>
                                Open
                              </Button>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

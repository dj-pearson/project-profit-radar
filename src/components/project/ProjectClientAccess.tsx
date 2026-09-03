/**
 * Give a customer access to their project (US-319).
 *
 * Before this there was no product surface that could do it. Three access
 * models existed and none of them reached a working page: a token link to
 * /portal/:token that no route answers, a client_portal_users table no
 * migration creates, and a client_portal role that could only be created
 * through the team-invite flow, which charged the contractor a seat for their
 * own customer and (until US-320) emailed nobody.
 *
 * Enrolment here writes the client_portal_access row every client-facing RLS
 * policy reads, and the project_communication_participants row that
 * project_messages has keyed its policy on since 20250706130335 and that
 * nothing has ever written (US-316).
 */
import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { UserPlus, Mail, ShieldCheck, ShieldOff } from 'lucide-react';

interface PortalAccessRow {
  id: string;
  client_email: string;
  access_level: string;
  is_active: boolean;
  last_accessed_at: string | null;
  created_at: string;
}

interface ProjectClientAccessProps {
  projectId: string;
}

const ACCESS_LEVELS: Record<string, string> = {
  read_only: 'View only',
  can_comment: 'View and comment',
  can_approve: 'View, comment and approve',
};

export function ProjectClientAccess({ projectId }: ProjectClientAccessProps) {
  const { toast } = useToast();
  const [rows, setRows] = useState<PortalAccessRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [accessLevel, setAccessLevel] = useState('read_only');

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('client_portal_access')
      .select('id, client_email, access_level, is_active, last_accessed_at, created_at')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Could not load client portal access', error);
      toast({
        variant: 'destructive',
        title: 'Could not load client access',
        description: error.message,
      });
    }
    setRows(data || []);
    setLoading(false);
  }, [projectId, toast]);

  useEffect(() => { void load(); }, [load]);

  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !firstName.trim()) {
      toast({
        variant: 'destructive',
        title: 'Name and email are required',
        description: 'The invite email is addressed to a person.',
      });
      return;
    }

    setSubmitting(true);
    try {
      // The edge function owns account creation, enrolment, the participant row
      // and delivery. None of that is safe from the browser: it needs the
      // service role, and company_id has to come from the authenticated caller.
      const { data, error } = await supabase.functions.invoke('invite-client', {
        body: {
          project_id: projectId,
          email: email.trim(),
          first_name: firstName.trim(),
          last_name: lastName.trim() || null,
          access_level: accessLevel,
        },
      });

      if (error) throw error;
      if (data && data.success === false) {
        throw new Error(data.error || 'Could not give this client access');
      }

      if (data?.data?.emailSent === false) {
        toast({
          variant: 'destructive',
          title: 'Access granted, but the email failed',
          description:
            `${firstName} can see this project once they sign in, but the invite email ` +
            'could not be sent. Use Resend invite below.',
        });
      } else {
        toast({
          title: 'Client invited',
          description: `${email.trim()} has been emailed a link to set a password and open this project.`,
        });
      }

      setEmail(''); setFirstName(''); setLastName(''); setAccessLevel('read_only');
      await load();
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Could not invite this client',
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const resend = async (row: PortalAccessRow) => {
    setBusyId(row.id);
    try {
      const { data, error } = await supabase.functions.invoke('invite-client', {
        body: {
          project_id: projectId,
          email: row.client_email,
          first_name: row.client_email.split('@')[0],
          access_level: row.access_level,
        },
      });
      if (error) throw error;
      if (data && data.success === false) throw new Error(data.error);
      toast({ title: 'Invite resent', description: `A new link is on its way to ${row.client_email}.` });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Could not resend the invite',
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    } finally {
      setBusyId(null);
    }
  };

  const setActive = async (row: PortalAccessRow, active: boolean) => {
    setBusyId(row.id);
    const { error } = await supabase
      .from('client_portal_access')
      .update({ is_active: active })
      .eq('id', row.id);

    if (error) {
      toast({
        variant: 'destructive',
        title: active ? 'Could not restore access' : 'Could not revoke access',
        description: error.message,
      });
    } else {
      toast({
        title: active ? 'Access restored' : 'Access revoked',
        description: active
          ? `${row.client_email} can see this project again.`
          : `${row.client_email} can no longer see this project.`,
      });
      await load();
    }
    setBusyId(null);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" aria-hidden="true" />
            Invite your client
          </CardTitle>
          <CardDescription>
            They get their own login showing this project's progress, photos, documents,
            invoices and change orders. Clients do not use a team seat.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={invite} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="client-first-name">First name</Label>
                <Input
                  id="client-first-name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Dana"
                />
              </div>
              <div>
                <Label htmlFor="client-last-name">Last name</Label>
                <Input
                  id="client-last-name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Whitfield"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="client-email">Email</Label>
                <Input
                  id="client-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="dana@example.com"
                />
              </div>
              <div>
                <Label htmlFor="client-access-level">What they can do</Label>
                <Select value={accessLevel} onValueChange={setAccessLevel}>
                  <SelectTrigger id="client-access-level">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ACCESS_LEVELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button type="submit" disabled={submitting}>
              <Mail className="h-4 w-4 mr-2" aria-hidden="true" />
              {submitting ? 'Sending invite...' : 'Send invite'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Who can see this project</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nobody outside your company can see this project yet.
            </p>
          ) : (
            <ul className="divide-y">
              {rows.map((row) => (
                <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{row.client_email}</p>
                    <p className="text-sm text-muted-foreground">
                      {ACCESS_LEVELS[row.access_level] || row.access_level}
                      {' · '}
                      {row.last_accessed_at
                        ? `last opened ${new Date(row.last_accessed_at).toLocaleDateString()}`
                        : 'has not opened it yet'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={row.is_active ? 'default' : 'secondary'}>
                      {row.is_active ? 'Active' : 'Revoked'}
                    </Badge>
                    {row.is_active && !row.last_accessed_at && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => resend(row)}
                        disabled={busyId === row.id}
                      >
                        <Mail className="h-4 w-4 mr-1" aria-hidden="true" />
                        Resend invite
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActive(row, !row.is_active)}
                      disabled={busyId === row.id}
                      aria-label={row.is_active
                        ? `Revoke access for ${row.client_email}`
                        : `Restore access for ${row.client_email}`}
                    >
                      {row.is_active
                        ? <><ShieldOff className="h-4 w-4 mr-1" aria-hidden="true" />Revoke</>
                        : <><ShieldCheck className="h-4 w-4 mr-1" aria-hidden="true" />Restore</>}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default ProjectClientAccess;

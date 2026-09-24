/**
 * Who is in a project's conversation (US-316).
 *
 * project_communication_participants decides who, outside the admin and
 * project manager roles, can read and post project_messages and attach files
 * to them. Clients land here automatically: a database trigger adds them when
 * their portal access is active and removes them when it is revoked. This panel
 * is where a manager sees that list, turns file uploads on or off per person,
 * removes someone, and adds a team member (a field supervisor, say) who would
 * otherwise have no way into the thread.
 */
import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { ErrorState } from '@/components/common/ErrorState';
import {
  useConversationParticipants,
  type ConversationPerson as Person,
  type ParticipantRow,
} from '@/hooks/useConversationParticipants';
import { MessageSquare, UserMinus, UserPlus } from 'lucide-react';

/** Roles that can manage the list; the participant table's RLS says the same. */
export const CONVERSATION_MANAGER_ROLES = ['admin', 'project_manager', 'root_admin'] as const;

export type { ParticipantRow };

const TYPE_LABEL: Record<string, string> = {
  client: 'Client',
  contractor: 'Team',
  project_manager: 'Project manager',
};

function displayName(p: Person | null, fallback: string): string {
  const name = [p?.first_name, p?.last_name].filter(Boolean).join(' ').trim();
  return name || p?.email || fallback;
}

export function ProjectConversationParticipants({ projectId }: { projectId: string }) {
  const { toast } = useToast();
  const { userProfile } = useAuth();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toAdd, setToAdd] = useState('');

  const canManage = CONVERSATION_MANAGER_ROLES.includes(
    (userProfile?.role ?? '') as (typeof CONVERSATION_MANAGER_ROLES)[number],
  );
  const conversation = useConversationParticipants(projectId, canManage);
  const rows = useMemo(() => conversation.participants.data ?? [], [conversation.participants.data]);
  const team = useMemo(() => conversation.team.data ?? [], [conversation.team.data]);
  const loading = conversation.participants.isLoading;
  const message = (err: unknown) => (err instanceof Error ? err.message : String(err));

  const addable = useMemo(
    () => team.filter((m) => !rows.some((r) => r.user_id === m.id)),
    [team, rows],
  );

  if (!canManage) return null;

  const add = async () => {
    if (!toAdd) return;
    setBusyId('add');
    try {
      await conversation.add.mutateAsync(toAdd);
      setToAdd('');
    } catch (err) {
      toast({ variant: 'destructive', title: 'Could not add them to the conversation', description: message(err) });
    } finally {
      setBusyId(null);
    }
  };

  const setUploads = async (row: ParticipantRow, value: boolean) => {
    setBusyId(row.id);
    try {
      await conversation.setUploads.mutateAsync({ id: row.id, value });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Could not change file uploads', description: message(err) });
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (row: ParticipantRow) => {
    setBusyId(row.id);
    try {
      await conversation.remove.mutateAsync(row.id);
      toast({
        title: 'Removed from the conversation',
        description: row.participant_type === 'client'
          ? 'They keep portal access to the project. Revoke and restore access to add them back.'
          : `${displayName(row.user, 'They')} can no longer read or post project messages.`,
      });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Could not remove them', description: message(err) });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" aria-hidden="true" />
          Project conversation
        </CardTitle>
        <CardDescription>
          Who can read and post project messages. Clients join when you give them portal
          access and leave when you revoke it. Admins and project managers can always reply.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : conversation.participants.error ? (
          <ErrorState
            inline
            title="Could not load the conversation list"
            error={message(conversation.participants.error)}
            onRetry={() => { void conversation.participants.refetch(); }}
          />
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nobody has been added yet. Invite your client above and they will appear here.
          </p>
        ) : (
          <ul className="divide-y" aria-label="Conversation participants">
            {rows.map((row) => {
              const name = displayName(row.user, 'Unknown user');
              return (
                <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{name}</p>
                    {row.user?.email && name !== row.user.email && (
                      <p className="text-sm text-muted-foreground truncate">{row.user.email}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={row.participant_type === 'client' ? 'default' : 'secondary'}>
                      {TYPE_LABEL[row.participant_type] || row.participant_type}
                    </Badge>
                    <div className="flex items-center gap-2">
                      <Switch
                        id={`uploads-${row.id}`}
                        checked={row.can_upload_files}
                        onCheckedChange={(v) => setUploads(row, v)}
                        disabled={busyId === row.id}
                        aria-label={`File uploads for ${name}`}
                      />
                      <Label htmlFor={`uploads-${row.id}`} className="text-sm">Files</Label>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => remove(row)}
                      disabled={busyId === row.id}
                      aria-label={`Remove ${name} from the conversation`}
                    >
                      <UserMinus className="h-4 w-4 mr-1" aria-hidden="true" />
                      Remove
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {conversation.team.error && (
          <p role="alert" className="text-sm text-destructive">
            Team members could not be loaded, so none can be added: {message(conversation.team.error)}
          </p>
        )}

        {addable.length > 0 && (
          <div className="flex flex-wrap items-end gap-2 border-t pt-4">
            <div className="min-w-[220px] flex-1">
              <Label htmlFor="conversation-add">Add a team member</Label>
              <Select value={toAdd} onValueChange={setToAdd}>
                <SelectTrigger id="conversation-add">
                  <SelectValue placeholder="Choose someone" />
                </SelectTrigger>
                <SelectContent>
                  {addable.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{displayName(m, m.id)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={add} disabled={!toAdd || busyId === 'add'}>
              <UserPlus className="h-4 w-4 mr-2" aria-hidden="true" />
              Add
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ProjectConversationParticipants;

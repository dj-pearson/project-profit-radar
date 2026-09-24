import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { CheckCircle, Edit, ExternalLink, HelpCircle, MessageSquare, PlusCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form } from '@/components/ui/form';
import { ListSkeleton } from '@/components/ui/skeletons';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/ui/responsive-dialog';
import {
  CheckboxFormField,
  InputFormField,
  SelectFormField,
  TextareaFormField,
} from '@/components/forms/FormFields';
import { ErrorState } from '@/components/common/ErrorState';
import { useRFIsPage, type RFI } from '@/hooks/useRFIsPage';
import { useCompanyTeamMembers } from '@/hooks/useCompanyTeamMembers';
import { formatDate } from '@/lib/format';
import {
  NO_MEMBER,
  RFI_PRIORITIES,
  RFI_STATUSES,
  buildRFIDraft,
  draftFromRFI,
  memberName,
  rfiAnswerFormSchema,
  rfiHubDefaults,
  rfiHubFormSchema,
  type RFIAnswerFormValues,
  type RFIHubFormValues,
  type TeamMember,
} from '@/lib/validations/communication';

const label = (s: string) => s.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
const errorText = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback);

interface HubRFIPanelProps {
  /** '' means every project. */
  projectId: string;
}

/**
 * The Communication Hub's RFIs tab (US-313): the same rfis rows /rfis lists,
 * narrowed to the project picked at the top of the hub. Raise, assign, answer
 * and close all go through useRFIsPage, so both screens write the same way.
 */
export function HubRFIPanel({ projectId }: HubRFIPanelProps) {
  const data = useRFIsPage();
  const team = useCompanyTeamMembers();
  const members = useMemo(() => team.data ?? [], [team.data]);
  const projects = data.query.data?.projects ?? [];
  const rfis = (data.query.data?.rfis ?? []).filter((r) => !projectId || r.project_id === projectId);

  const [editing, setEditing] = useState<RFI | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [answering, setAnswering] = useState<RFI | null>(null);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (rfi: RFI) => {
    setEditing(rfi);
    setFormOpen(true);
  };

  const close = async (rfi: RFI) => {
    try {
      await data.update.mutateAsync({ id: rfi.id, draft: draftFromRFI(rfi, 'closed') });
      toast.success(`${rfi.rfi_number} closed`);
    } catch (e) {
      toast.error('RFI not closed', { description: errorText(e, 'Failed to close the RFI') });
    }
  };

  const allRfisHref = projectId ? `/rfis?project=${projectId}` : '/rfis';

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1.5">
          <CardTitle>Requests for information</CardTitle>
          <CardDescription>
            {projectId ? 'RFIs on the selected project.' : 'RFIs across every project.'} The same list as the RFIs page.
          </CardDescription>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to={allRfisHref}>
              <ExternalLink className="h-4 w-4 mr-2" aria-hidden="true" />
              RFIs page
            </Link>
          </Button>
          <Button size="sm" onClick={openCreate} disabled={projects.length === 0}>
            <PlusCircle className="h-4 w-4 mr-2" aria-hidden="true" />
            Raise RFI
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {data.query.isLoading ? (
          <ListSkeleton items={3} label="Loading RFIs" />
        ) : data.query.error ? (
          <ErrorState
            inline
            title="RFIs could not be loaded"
            error={errorText(data.query.error, 'Failed to load RFIs')}
            onRetry={() => { void data.query.refetch(); }}
          />
        ) : rfis.length === 0 ? (
          <div className="py-8 text-center">
            <HelpCircle className="h-10 w-10 mx-auto text-muted-foreground mb-3" aria-hidden="true" />
            <p className="text-muted-foreground">
              {projects.length === 0
                ? 'Create a project first; every RFI belongs to one.'
                : projectId
                  ? 'No RFIs on this project yet.'
                  : 'No RFIs yet.'}
            </p>
          </div>
        ) : (
          <ul className="divide-y" aria-label="RFIs">
            {rfis.map((rfi) => (
              <li key={rfi.id} className="py-4 first:pt-0 last:pb-0 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium">{rfi.subject || rfi.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {rfi.rfi_number}
                      {!projectId && rfi.projects?.name ? ` - ${rfi.projects.name}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={rfi.status === 'closed' ? 'secondary' : 'outline'}>{label(rfi.status || 'submitted')}</Badge>
                    <Badge variant={rfi.priority === 'urgent' || rfi.priority === 'high' ? 'destructive' : 'outline'}>
                      {label(rfi.priority || 'medium')}
                    </Badge>
                  </div>
                </div>
                {rfi.description && <p className="text-sm">{rfi.description}</p>}
                <dl className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-1 text-sm">
                  <div className="flex gap-1">
                    <dt className="text-muted-foreground">Raised by</dt>
                    <dd>{`${rfi.requester.first_name} ${rfi.requester.last_name}`.trim()}</dd>
                  </div>
                  <div className="flex gap-1">
                    <dt className="text-muted-foreground">Assigned to</dt>
                    <dd>{rfi.submitted_to || 'Unassigned'}</dd>
                  </div>
                  <div className="flex gap-1">
                    <dt className="text-muted-foreground">Due</dt>
                    <dd>{rfi.due_date ? formatDate(`${rfi.due_date.slice(0, 10)}T00:00:00`) : 'Not set'}</dd>
                  </div>
                </dl>
                {rfi.responses.length > 0 && (
                  <ul className="space-y-2" aria-label={`Answers to ${rfi.rfi_number}`}>
                    {rfi.responses.map((resp) => (
                      <li key={resp.id} className="rounded-md bg-muted p-3 text-sm">
                        <p className="font-medium">
                          {`${resp.responder.first_name} ${resp.responder.last_name}`.trim()}
                          {resp.is_final_response ? ' (final)' : ''}
                          <span className="font-normal text-muted-foreground"> - {formatDate(resp.response_date)}</span>
                        </p>
                        <p>{resp.response_text}</p>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="flex flex-wrap justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(rfi)}>
                    <Edit className="h-3 w-3 mr-1" aria-hidden="true" />
                    Edit or assign
                  </Button>
                  {rfi.status !== 'closed' && rfi.status !== 'cancelled' && (
                    <>
                      <Button variant="outline" size="sm" onClick={() => setAnswering(rfi)}>
                        <MessageSquare className="h-3 w-3 mr-1" aria-hidden="true" />
                        Answer
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => { void close(rfi); }} disabled={data.update.isPending}>
                        <CheckCircle className="h-3 w-3 mr-1" aria-hidden="true" />
                        Close
                      </Button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <RFIFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        rfi={editing}
        projectId={projectId}
        projects={projects}
        members={members}
        onSubmit={async (values) => {
          const draft = buildRFIDraft(values, members);
          if (editing) await data.update.mutateAsync({ id: editing.id, draft });
          else await data.create.mutateAsync(draft);
        }}
      />
      <RFIAnswerDialog
        rfi={answering}
        onOpenChange={(open) => { if (!open) setAnswering(null); }}
        onSubmit={(values) =>
          data.respond.mutateAsync({ rfiId: (answering as RFI).id, text: values.text.trim(), isFinal: values.is_final })
        }
      />
    </Card>
  );
}

interface RFIFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rfi: RFI | null;
  projectId: string;
  projects: { id: string; name: string }[];
  members: TeamMember[];
  onSubmit: (values: RFIHubFormValues) => Promise<void>;
}

function RFIFormDialog({ open, onOpenChange, rfi, projectId, projects, members, onSubmit }: RFIFormDialogProps) {
  const form = useForm<RFIHubFormValues>({
    resolver: zodResolver(rfiHubFormSchema),
    defaultValues: rfiHubDefaults(projectId),
  });
  const { reset } = form;
  // Reset once per opening. Resetting whenever the team list refetched would
  // wipe what someone was typing.
  const wasOpen = useRef(false);

  useEffect(() => {
    if (open && !wasOpen.current) reset(rfiHubDefaults(projectId, rfi, members));
    wasOpen.current = open;
  }, [open, rfi, projectId, members, reset]);

  const submit = async (values: RFIHubFormValues) => {
    try {
      await onSubmit(values);
      toast.success(rfi ? 'RFI updated' : 'RFI raised');
      onOpenChange(false);
    } catch (e) {
      toast.error(rfi ? 'RFI not updated' : 'RFI not raised', { description: errorText(e, 'Failed to save the RFI') });
    }
  };

  const memberOptions = [
    { value: NO_MEMBER, label: 'Nobody on the team' },
    ...members.map((m) => ({ value: m.id, label: memberName(m) || 'Unnamed team member' })),
  ];

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="max-w-2xl">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{rfi ? `Edit ${rfi.rfi_number}` : 'Raise an RFI'}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Ask the question in writing and assign who owes the answer.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(submit)} noValidate className="space-y-4 px-4 pb-4 sm:px-0 sm:pb-0" aria-label="RFI form">
            <SelectFormField
              control={form.control}
              name="project_id"
              label="Project"
              placeholder="Select project"
              options={projects.map((p) => ({ value: p.id, label: p.name }))}
            />
            <InputFormField control={form.control} name="title" label="Subject" aria-required="true" />
            <TextareaFormField control={form.control} name="description" label="Question" rows={4} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SelectFormField control={form.control} name="assignee_member" label="Assign to team member" options={memberOptions} />
              <InputFormField
                control={form.control}
                name="assignee_external"
                label="Or an outside party"
                placeholder="Architect, engineer or firm"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <SelectFormField
                control={form.control}
                name="priority"
                label="Priority"
                options={RFI_PRIORITIES.map((p) => ({ value: p, label: label(p) }))}
              />
              {rfi && (
                <SelectFormField
                  control={form.control}
                  name="status"
                  label="Status"
                  options={RFI_STATUSES.map((s) => ({ value: s, label: label(s) }))}
                />
              )}
              <InputFormField control={form.control} name="due_date" label="Answer due" type="date" />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {rfi ? 'Save RFI' : 'Raise RFI'}
              </Button>
            </div>
          </form>
        </Form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

interface RFIAnswerDialogProps {
  rfi: RFI | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: RFIAnswerFormValues) => Promise<void>;
}

function RFIAnswerDialog({ rfi, onOpenChange, onSubmit }: RFIAnswerDialogProps) {
  const form = useForm<RFIAnswerFormValues>({
    resolver: zodResolver(rfiAnswerFormSchema),
    defaultValues: { text: '', is_final: false },
  });
  const { reset } = form;

  useEffect(() => {
    if (rfi) reset({ text: '', is_final: false });
  }, [rfi, reset]);

  const submit = async (values: RFIAnswerFormValues) => {
    try {
      await onSubmit(values);
      toast.success(values.is_final ? 'Answer saved and RFI closed' : 'Answer saved');
      onOpenChange(false);
    } catch (e) {
      toast.error('Answer not saved', { description: errorText(e, 'Failed to save the answer') });
    }
  };

  return (
    <ResponsiveDialog open={!!rfi} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="max-w-2xl">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Answer {rfi?.rfi_number}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>{rfi?.subject || rfi?.title}</ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(submit)} noValidate className="space-y-4 px-4 pb-4 sm:px-0 sm:pb-0" aria-label="RFI answer form">
            <TextareaFormField control={form.control} name="text" label="Answer" rows={5} />
            <CheckboxFormField control={form.control} name="is_final" label="Final answer (closes the RFI)" />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                Save answer
              </Button>
            </div>
          </form>
        </Form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

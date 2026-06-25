/**
 * Safety incidents panel (US-103): analytics dashboard + filterable incident
 * list with a detail view. company_id-scoped (RLS); uses safety_incidents.
 */
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ShieldCheck, AlertTriangle, CalendarClock, ClipboardList, FileWarning } from 'lucide-react';
import {
  summarizeIncidents,
  filterAndSortIncidents,
  normalizeSeverity,
  type Severity,
  type IncidentSortField,
} from '@/lib/safety/incidentStats';

interface IncidentRow {
  id: string;
  incident_date: string;
  incident_time: string | null;
  severity: string;
  incident_type: string;
  status: string | null;
  location: string | null;
  description: string;
  project_id: string | null;
  injured_person_name: string | null;
  immediate_actions: string | null;
  corrective_actions: string | null;
  root_cause_analysis: string | null;
  witnesses: string[] | null;
  osha_recordable: boolean | null;
  lost_time: boolean | null;
  days_away_from_work: number | null;
}

const severityBadge: Record<Severity, string> = {
  critical: 'bg-red-100 text-red-700 border-red-200',
  major: 'bg-orange-100 text-orange-700 border-orange-200',
  minor: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  other: '',
};

function fmtDate(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
}

export function SafetyIncidentsPanel() {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id;

  const [severity, setSeverity] = useState<Severity | 'all'>('all');
  const [projectId, setProjectId] = useState<string>('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [sortBy, setSortBy] = useState<IncidentSortField>('date');
  const [selected, setSelected] = useState<IncidentRow | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['safety-incidents-panel', companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const [incidentsRes, projectsRes] = await Promise.all([
        supabase
          .from('safety_incidents')
          .select(
            'id, incident_date, incident_time, severity, incident_type, status, location, description, project_id, injured_person_name, immediate_actions, corrective_actions, root_cause_analysis, witnesses, osha_recordable, lost_time, days_away_from_work'
          )
          .eq('company_id', companyId)
          .order('incident_date', { ascending: false }),
        supabase.from('projects').select('id, name').eq('company_id', companyId),
      ]);
      if (incidentsRes.error) throw incidentsRes.error;
      return {
        incidents: (incidentsRes.data ?? []) as IncidentRow[],
        projectNames: new Map(
          ((projectsRes.data ?? []) as { id: string; name: string }[]).map((p) => [p.id, p.name])
        ),
      };
    },
  });

  const stats = useMemo(
    () => (data ? summarizeIncidents(data.incidents) : null),
    [data]
  );

  const visible = useMemo(() => {
    if (!data) return [];
    return filterAndSortIncidents(
      data.incidents,
      { severity, projectId, from: from || undefined, to: to || undefined },
      sortBy,
      'desc'
    );
  }, [data, severity, projectId, from, to, sortBy]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const maxTrend = Math.max(1, ...(stats?.monthlyTrend.map((p) => p.count) ?? [1]));

  return (
    <div className="space-y-6">
      {/* Dashboard stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            label="Days Since Last Incident"
            value={stats.daysSinceLastIncident == null ? '—' : String(stats.daysSinceLastIncident)}
            icon={CalendarClock}
            tone="good"
          />
          <StatCard label="Total Incidents" value={String(stats.total)} icon={ClipboardList} />
          <StatCard label="Open" value={String(stats.openCount)} icon={AlertTriangle} tone="warn" />
          <StatCard label="OSHA Recordable" value={String(stats.oshaRecordableCount)} icon={FileWarning} tone="warn" />
        </div>
      )}

      {/* Severity breakdown + trend */}
      {stats && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Severity Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(['critical', 'major', 'minor', 'other'] as Severity[]).map((sev) => (
                <div key={sev} className="flex items-center justify-between text-sm">
                  <span className="capitalize flex items-center gap-2">
                    <Badge variant="outline" className={severityBadge[sev]}>{sev}</Badge>
                  </span>
                  <span className="font-semibold">{stats.bySeverity[sev]}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Incidents per Month</CardTitle>
              <CardDescription>Trailing 12 months.</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={stats.monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} domain={[0, maxTrend]} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filterable incident list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Incident Log</CardTitle>
          <CardDescription>Filter and sort, then open an incident for investigation details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Select value={severity} onValueChange={(v) => setSeverity(v as Severity | 'all')}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Severity" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All severities</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="major">Major</SelectItem>
                <SelectItem value="minor">Minor</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Project" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All projects</SelectItem>
                {data &&
                  Array.from(data.projectNames.entries()).map(([id, name]) => (
                    <SelectItem key={id} value={id}>{name}</SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" aria-label="From date" />
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" aria-label="To date" />
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as IncidentSortField)}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Sort by" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Sort: Date</SelectItem>
                <SelectItem value="severity">Sort: Severity</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {visible.length === 0 ? (
            <EmptyState
              icon={ShieldCheck}
              title="No incidents match"
              description="No safety incidents match the current filters."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">Date</th>
                    <th className="py-2 px-3 font-medium">Type</th>
                    <th className="py-2 px-3 font-medium">Severity</th>
                    <th className="py-2 px-3 font-medium">Project</th>
                    <th className="py-2 px-3 font-medium">Status</th>
                    <th className="py-2 px-3 font-medium text-right">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((inc) => {
                    const sev = normalizeSeverity(inc.severity);
                    return (
                      <tr key={inc.id} className="border-b last:border-0">
                        <td className="py-2 pr-3">{fmtDate(inc.incident_date)}</td>
                        <td className="py-2 px-3 capitalize">{inc.incident_type?.replace(/_/g, ' ')}</td>
                        <td className="py-2 px-3">
                          <Badge variant="outline" className={severityBadge[sev]}>{sev}</Badge>
                        </td>
                        <td className="py-2 px-3">{data?.projectNames.get(inc.project_id ?? '') ?? '—'}</td>
                        <td className="py-2 px-3 capitalize">{inc.status ?? '—'}</td>
                        <td className="py-2 px-3 text-right">
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setSelected(inc)}>
                            View
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="capitalize flex items-center gap-2">
                  {selected.incident_type?.replace(/_/g, ' ')}
                  <Badge variant="outline" className={severityBadge[normalizeSeverity(selected.severity)]}>
                    {normalizeSeverity(selected.severity)}
                  </Badge>
                </DialogTitle>
                <DialogDescription>
                  {fmtDate(selected.incident_date)}
                  {selected.incident_time ? ` at ${selected.incident_time}` : ''}
                  {selected.location ? ` · ${selected.location}` : ''}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 text-sm">
                <DetailField label="Description" value={selected.description} />
                <DetailField label="Injured Person" value={selected.injured_person_name} />
                <div className="flex flex-wrap gap-2">
                  {selected.osha_recordable && <Badge variant="destructive">OSHA Recordable</Badge>}
                  {selected.lost_time && <Badge variant="destructive">Lost Time</Badge>}
                  {selected.days_away_from_work ? (
                    <Badge variant="outline">{selected.days_away_from_work} days away</Badge>
                  ) : null}
                </div>
                <DetailField label="Immediate Actions" value={selected.immediate_actions} />
                <DetailField label="Root Cause Analysis" value={selected.root_cause_analysis} />
                <DetailField label="Corrective Actions" value={selected.corrective_actions} />
                {selected.witnesses && selected.witnesses.length > 0 && (
                  <DetailField label="Witnesses" value={selected.witnesses.join(', ')} />
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  icon: typeof ShieldCheck;
  tone?: 'neutral' | 'good' | 'warn';
}) {
  const toneClass = tone === 'good' ? 'text-green-600' : tone === 'warn' ? 'text-amber-600' : 'text-muted-foreground';
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{label}</span>
          <Icon className={`h-4 w-4 ${toneClass}`} aria-hidden="true" />
        </div>
        <div className="mt-1 text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

function DetailField({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div>
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className="mt-0.5 whitespace-pre-wrap">{value}</div>
    </div>
  );
}

export default SafetyIncidentsPanel;

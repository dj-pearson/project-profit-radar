/**
 * Import a schedule from a spreadsheet (US-044, US-329).
 *
 * This page was three hardcoded arrays: a list of "supported formats"
 * (Microsoft Project, Primavera P6, Asta Powerproject), a field-mapping table
 * with tick marks, and a preview of an imaginary project starting 2026-03-01.
 * No file input, no parser, no Supabase call, and no route in src/routes, so
 * nobody could reach it to discover any of that.
 *
 * What it does now is narrower and real: read a CSV or XLSX export, map its
 * columns however that tool named them, show every row and every problem, and
 * on confirmation write schedule_tasks and their finish-to-start dependencies.
 * Every one of those tools exports a spreadsheet; parsing .mpp and .xer in the
 * browser is a different project, and claiming it in a UI label was the
 * original sin here.
 */
import { useState } from 'react';
import * as XLSX from 'xlsx';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Upload, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import { RoleGuard, ROLE_GROUPS } from '@/components/auth/RoleGuard';
import { useNavigate } from 'react-router-dom';
import { parseScheduleSheet, type ScheduleImportResult } from '@/lib/scheduleImport';

interface ProjectOption { id: string; name: string }

const ScheduleImport = () => {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [projectId, setProjectId] = useState('');
  const [fileName, setFileName] = useState('');
  const [result, setResult] = useState<ScheduleImportResult | null>(null);
  const [importing, setImporting] = useState(false);

  const loadProjects = async () => {
    if (!userProfile?.company_id || projects.length > 0) return;
    const { data, error } = await supabase
      .from('projects')
      .select('id, name')
      .eq('company_id', userProfile.company_id)
      .in('status', ['planning', 'active'])
      .order('name');
    if (error) {
      logger.error('Could not load projects for schedule import', error);
      toast({ variant: 'destructive', title: 'Could not load projects', description: error.message });
      return;
    }
    setProjects((data || []) as ProjectOption[]);
  };

  const readFile = async (file: File) => {
    setFileName(file.name);
    try {
      const buffer = await file.arrayBuffer();
      const book = XLSX.read(buffer, { type: 'array', cellDates: true });
      const sheet = book.Sheets[book.SheetNames[0]];
      if (!sheet) throw new Error('That file has no sheets.');
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: '' }) as unknown[][];
      setResult(parseScheduleSheet(rows));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not read that file';
      logger.error('Schedule import parse failed', err);
      toast({ variant: 'destructive', title: 'Could not read that file', description: message });
      setResult(null);
    }
  };

  const runImport = async () => {
    if (!result || !projectId || !userProfile?.company_id) return;
    if (result.tasks.length === 0) return;

    setImporting(true);
    try {
      const { data: inserted, error } = await supabase
        .from('schedule_tasks')
        .insert(result.tasks.map((task) => ({
          company_id: userProfile.company_id,
          project_id: projectId,
          name: task.name,
          start_date: task.startDate,
          duration_days: task.durationDays,
          sort_order: task.sortOrder,
          status: 'not_started',
        })) as never)
        .select('id, name, sort_order');

      if (error) throw new Error(error.message);

      // Map the file's own ids to the rows we just created, so predecessors
      // land as real foreign keys instead of being dropped.
      const bySortOrder = new Map(
        (inserted || []).map((row: { id: string; sort_order: number }) => [row.sort_order, row.id])
      );
      const idBySourceId = new Map(
        result.tasks.map((task) => [task.sourceId, bySortOrder.get(task.sortOrder)])
      );

      const dependencies = result.tasks.flatMap((task) =>
        task.predecessors
          .map((ref) => ({
            predecessor: idBySourceId.get(ref),
            successor: idBySourceId.get(task.sourceId),
          }))
          .filter((d) => d.predecessor && d.successor)
          .map((d) => ({
            company_id: userProfile.company_id,
            project_id: projectId,
            predecessor_id: d.predecessor as string,
            successor_id: d.successor as string,
            lag_days: 0,
          }))
      );

      if (dependencies.length > 0) {
        const { error: depError } = await supabase
          .from('schedule_task_dependencies')
          .insert(dependencies as never);
        if (depError) {
          // The tasks are in. Saying nothing here would leave a schedule that
          // looks complete and does not cascade when anybody drags a task.
          logger.error('Schedule tasks imported but dependencies failed', depError);
          toast({
            variant: 'destructive',
            title: `${result.tasks.length} tasks imported without their dependencies`,
            description: `Link them by hand on the project schedule. Reason: ${depError.message}`,
          });
          navigate('/project-schedule');
          return;
        }
      }

      toast({
        title: 'Schedule imported',
        description: `${result.tasks.length} task(s) and ${dependencies.length} dependency link(s).`,
      });
      navigate('/project-schedule');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not import that schedule';
      logger.error('Schedule import failed', err);
      toast({ variant: 'destructive', title: 'Could not import the schedule', description: message });
    } finally {
      setImporting(false);
    }
  };

  return (
    <RoleGuard allowedRoles={ROLE_GROUPS.PROJECT_EDITORS}>
      <DashboardLayout title="Import a schedule">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" aria-hidden="true" />
                Import a schedule
              </CardTitle>
              <CardDescription>
                A CSV or XLSX export from Microsoft Project, Primavera, Asta or a
                spreadsheet. Needs a task-name column and a start-date column; duration,
                finish date and predecessors are used when present.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="import-project">Project</Label>
                  <Select value={projectId} onValueChange={setProjectId} onOpenChange={loadProjects}>
                    <SelectTrigger id="import-project">
                      <SelectValue placeholder="Select a project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="import-file">Schedule file</Label>
                  <Input
                    id="import-file"
                    type="file"
                    accept=".csv,.xlsx,.xls,.txt"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void readFile(file);
                    }}
                  />
                  {fileName && (
                    <p className="text-xs text-muted-foreground mt-1">{fileName}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {result && (
            <>
              {result.skipped.length > 0 && (
                <Alert variant={result.tasks.length === 0 ? 'destructive' : 'default'}>
                  <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                  <AlertDescription>
                    <p className="font-medium">
                      {result.skipped.length} row(s) could not be used:
                    </p>
                    <ul className="list-disc ml-5 mt-1 text-sm">
                      {result.skipped.slice(0, 8).map((s) => (
                        <li key={`${s.row}-${s.reason}`}>
                          {s.row > 0 ? `Row ${s.row}: ` : ''}{s.reason}
                        </li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {result.unresolved.length > 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                  <AlertDescription>
                    {result.unresolved.length} dependency reference(s) point at rows that are
                    not in this file and will be dropped. The tasks still import.
                  </AlertDescription>
                </Alert>
              )}

              {result.tasks.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                      {result.tasks.length} task(s) ready to import
                    </CardTitle>
                    <CardDescription>
                      Check the dates before importing. A date written D/M is read as M/D.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto max-h-96">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-background">
                          <tr className="text-left text-muted-foreground border-b">
                            <th className="py-2 pr-3 font-medium">Id</th>
                            <th className="py-2 px-3 font-medium">Task</th>
                            <th className="py-2 px-3 font-medium">Start</th>
                            <th className="py-2 px-3 font-medium text-right">Days</th>
                            <th className="py-2 pl-3 font-medium">Follows</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.tasks.map((task) => (
                            <tr key={`${task.sourceId}-${task.sortOrder}`} className="border-b last:border-0">
                              <td className="py-1.5 pr-3 text-muted-foreground">{task.sourceId}</td>
                              <td className="py-1.5 px-3">{task.name}</td>
                              <td className="py-1.5 px-3">{task.startDate}</td>
                              <td className="py-1.5 px-3 text-right">{task.durationDays}</td>
                              <td className="py-1.5 pl-3">
                                {task.predecessors.length > 0
                                  ? task.predecessors.map((p) => (
                                      <Badge key={p} variant="outline" className="mr-1">{p}</Badge>
                                    ))
                                  : <span className="text-muted-foreground">-</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="mt-4 flex justify-end">
                      <Button
                        type="button"
                        onClick={runImport}
                        disabled={importing || !projectId}
                      >
                        {importing
                          ? 'Importing...'
                          : projectId
                            ? `Import ${result.tasks.length} task(s)`
                            : 'Select a project first'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </DashboardLayout>
    </RoleGuard>
  );
};

export default ScheduleImport;

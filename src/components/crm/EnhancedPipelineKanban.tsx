/**
 * Enhanced Pipeline Kanban
 * Drag-and-drop visual pipeline for managing leads.
 *
 * The pipeline position lives in `leads.status` (text, default 'new'). There is
 * no `leads.stage` column; querying one made PostgREST reject every load, and
 * the board rendered empty. Status values follow the taxonomy CRMLeads and
 * PipelineKanban already use: new, contacted, qualified, proposal_sent,
 * negotiating, won, lost.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/common/ErrorState';
import { DollarSign, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

/** The leads column that holds the pipeline position. */
export const PIPELINE_STATUS_COLUMN = 'status';

export interface PipelineLead {
  id: string;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  estimated_budget: number | null;
  status: string | null;
  priority: string | null;
  created_at: string | null;
}

interface PipelineStage {
  id: string;
  name: string;
  color: string;
}

interface EnhancedPipelineKanbanProps {
  onLeadClick?: (lead: PipelineLead) => void;
  onNewLead?: () => void;
}

export const PIPELINE_STAGES: PipelineStage[] = [
  { id: 'new', name: 'New', color: 'bg-gray-100' },
  { id: 'contacted', name: 'Contacted', color: 'bg-blue-100' },
  { id: 'qualified', name: 'Qualified', color: 'bg-purple-100' },
  { id: 'proposal_sent', name: 'Proposal', color: 'bg-yellow-100' },
  { id: 'negotiating', name: 'Negotiation', color: 'bg-orange-100' },
  { id: 'won', name: 'Won', color: 'bg-green-100' }
];

const leadName = (lead: PipelineLead) =>
  [lead.first_name, lead.last_name].filter(Boolean).join(' ') || lead.email || 'Unnamed lead';

export const EnhancedPipelineKanban: React.FC<EnhancedPipelineKanbanProps> = ({
  onLeadClick,
  onNewLead
}) => {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id;
  const { toast } = useToast();
  const [leads, setLeads] = useState<PipelineLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [draggedLead, setDraggedLead] = useState<PipelineLead | null>(null);

  const loadLeads = useCallback(async () => {
    if (!companyId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);
    try {
      // (supabase as any): leads.company_id is enforced by RLS and migrations
      // but missing from the generated types until they are regenerated.
      const { data, error } = await (supabase as any)
        .from('leads')
        .select('id, first_name, last_name, company_name, email, phone, estimated_budget, status, priority, created_at')
        .eq('company_id', companyId)
        .neq(PIPELINE_STATUS_COLUMN, 'lost')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeads((data as PipelineLead[]) || []);
    } catch (error) {
      setLoadError(error instanceof Error ? error : new Error(String((error as { message?: string })?.message ?? error)));
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  const handleDrop = async (newStatus: string) => {
    const lead = draggedLead;
    setDraggedLead(null);
    if (!lead || !companyId || lead.status === newStatus) return;

    try {
      const { error } = await (supabase as any)
        .from('leads')
        .update({ [PIPELINE_STATUS_COLUMN]: newStatus })
        .eq('id', lead.id)
        .eq('company_id', companyId);

      if (error) throw error;

      setLeads(prev => prev.map(l =>
        l.id === lead.id ? { ...l, status: newStatus } : l
      ));

      toast({ title: 'Lead updated' });
    } catch (error) {
      toast({
        title: 'Could not move lead',
        description: (error as { message?: string })?.message || 'The lead was not moved. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Sales Pipeline</h2>
        {onNewLead && (
          <Button onClick={onNewLead}>
            <Plus className="h-4 w-4 mr-2" />
            New Lead
          </Button>
        )}
      </div>

      {loadError ? (
        <ErrorState
          title="Couldn't load the pipeline"
          error={loadError}
          onRetry={loadLeads}
        />
      ) : loading ? (
        <div className="flex gap-4 overflow-x-auto pb-4" data-testid="pipeline-loading">
          {PIPELINE_STAGES.map(stage => (
            <Skeleton key={stage.id} className="h-48 w-80 flex-shrink-0" />
          ))}
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {PIPELINE_STAGES.map(stage => {
            const stageLeads = leads.filter(l => (l.status || 'new') === stage.id);
            return (
              <div
                key={stage.id}
                className="flex-shrink-0 w-80"
                data-testid={`pipeline-stage-${stage.id}`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(stage.id)}
              >
                <Card className={stage.color}>
                  <CardHeader>
                    <CardTitle className="text-sm">{stage.name}</CardTitle>
                    <Badge variant="secondary">{stageLeads.length}</Badge>
                  </CardHeader>
                </Card>

                <div className="space-y-3 mt-3">
                  {stageLeads.map(lead => (
                    <Card
                      key={lead.id}
                      draggable
                      onDragStart={() => setDraggedLead(lead)}
                      onClick={() => onLeadClick?.(lead)}
                      className="cursor-move"
                    >
                      <CardContent className="p-4">
                        <h4 className="font-semibold">{lead.company_name || leadName(lead)}</h4>
                        <p className="text-sm text-muted-foreground">{leadName(lead)}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <DollarSign className="h-4 w-4" />
                          {formatCurrency(lead.estimated_budget || 0)}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default EnhancedPipelineKanban;

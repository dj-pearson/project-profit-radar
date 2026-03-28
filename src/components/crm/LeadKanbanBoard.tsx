import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  company_name?: string;
  estimated_budget?: number;
  status: string;
  priority: string;
  updated_at: string;
}

interface LeadKanbanBoardProps {
  leads: Lead[];
  onStatusChange: (leadId: string, newStatus: string) => void;
}

const PIPELINE_STAGES = [
  'new',
  'contacted',
  'qualified',
  'proposal_sent',
  'negotiating',
  'won',
  'lost',
] as const;

const STAGE_LABELS: Record<string, string> = {
  new: 'New Lead',
  contacted: 'Contacted',
  qualified: 'Qualified',
  proposal_sent: 'Proposal Sent',
  negotiating: 'Negotiation',
  won: 'Won',
  lost: 'Lost',
};

const PRIORITY_BORDER: Record<string, string> = {
  urgent: 'border-l-red-500',
  high: 'border-l-orange-500',
  medium: 'border-l-blue-500',
  low: 'border-l-gray-400',
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

const daysInStage = (updatedAt: string): number => {
  const diff = Date.now() - new Date(updatedAt).getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
};

const LeadKanbanBoard: React.FC<LeadKanbanBoardProps> = ({ leads, onStatusChange }) => {
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);

  const leadsByStage = (stage: string) => leads.filter((l) => l.status === stage);

  const stageBudgetTotal = (stage: string) =>
    leadsByStage(stage).reduce((sum, l) => sum + (l.estimated_budget || 0), 0);

  const handleDragStart = useCallback((e: React.DragEvent, leadId: string) => {
    e.dataTransfer.setData('text/plain', leadId);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, stage: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverStage(stage);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverStage(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, stage: string) => {
      e.preventDefault();
      setDragOverStage(null);
      const leadId = e.dataTransfer.getData('text/plain');
      if (leadId) {
        onStatusChange(leadId, stage);
      }
    },
    [onStatusChange]
  );

  return (
    <ScrollArea className="w-full">
      <div className="flex gap-4 pb-4 min-w-max">
        {PIPELINE_STAGES.map((stage) => {
          const stageLeads = leadsByStage(stage);
          const total = stageBudgetTotal(stage);
          const isOver = dragOverStage === stage;

          return (
            <div
              key={stage}
              className={`flex-shrink-0 w-72 rounded-lg border bg-muted/30 transition-colors ${
                isOver ? 'bg-primary/10 border-primary' : ''
              }`}
              onDragOver={(e) => handleDragOver(e, stage)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, stage)}
            >
              {/* Column Header */}
              <div className="p-3 border-b">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-semibold text-sm">{STAGE_LABELS[stage]}</h3>
                  <Badge variant="secondary" className="text-xs">
                    {stageLeads.length}
                  </Badge>
                </div>
                {total > 0 && (
                  <p className="text-xs text-muted-foreground">{formatCurrency(total)}</p>
                )}
              </div>

              {/* Cards */}
              <div className="p-2 space-y-2 min-h-[120px]">
                {stageLeads.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-6">No leads</p>
                )}
                {stageLeads.map((lead) => {
                  const days = daysInStage(lead.updated_at);
                  const borderClass = PRIORITY_BORDER[lead.priority] || PRIORITY_BORDER.low;

                  return (
                    <Card
                      key={lead.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, lead.id)}
                      className={`cursor-grab active:cursor-grabbing border-l-4 ${borderClass} hover:shadow-md transition-shadow`}
                      role="article"
                      aria-label={`Lead: ${lead.first_name} ${lead.last_name}`}
                    >
                      <CardContent className="p-3">
                        <p className="font-medium text-sm truncate">
                          {lead.first_name} {lead.last_name}
                        </p>
                        {lead.company_name && (
                          <p className="text-xs text-muted-foreground truncate">
                            {lead.company_name}
                          </p>
                        )}
                        <div className="flex items-center justify-between mt-2">
                          {lead.estimated_budget ? (
                            <Badge variant="outline" className="text-xs">
                              {formatCurrency(lead.estimated_budget)}
                            </Badge>
                          ) : (
                            <span />
                          )}
                          <span className="text-xs text-muted-foreground">
                            {days}d in stage
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
};

export { LeadKanbanBoard };

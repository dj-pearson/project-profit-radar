import React, { useMemo, useState } from 'react';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, DollarSign, Clock } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import {
  groupLeadsByStage, daysInStage, leadDisplayName, valueTier,
  type KanbanLead, type ValueTier,
} from '@/lib/crm/leadsKanban';

interface LeadsKanbanBoardProps {
  leads: KanbanLead[];
  /** Persist a stage change (writes leads.status). */
  onStatusChange: (leadId: string, status: string) => void | Promise<void>;
  onLeadClick?: (leadId: string) => void;
}

const TIER_BORDER: Record<ValueTier, string> = {
  high: 'border-l-4 border-l-green-500',
  medium: 'border-l-4 border-l-yellow-500',
  low: 'border-l-4 border-l-slate-300',
};

export const LeadsKanbanBoard: React.FC<LeadsKanbanBoardProps> = ({ leads, onStatusChange, onLeadClick }) => {
  // Local optimistic copy so a dropped card moves immediately.
  const [optimistic, setOptimistic] = useState<Record<string, string>>({});

  const effectiveLeads = useMemo(
    () => leads.map((l) => (optimistic[l.id] ? { ...l, status: optimistic[l.id] } : l)),
    [leads, optimistic]
  );

  const columns = useMemo(() => groupLeadsByStage(effectiveLeads), [effectiveLeads]);

  const handleDragEnd = (result: DropResult) => {
    const { destination, draggableId, source } = result;
    if (!destination || destination.droppableId === source.droppableId) return;
    const newStatus = destination.droppableId;
    setOptimistic((prev) => ({ ...prev, [draggableId]: newStatus }));
    Promise.resolve(onStatusChange(draggableId, newStatus)).catch(() => {
      // Roll back the optimistic move on failure.
      setOptimistic((prev) => {
        const next = { ...prev };
        delete next[draggableId];
        return next;
      });
    });
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4" role="list" aria-label="Lead pipeline stages">
        {columns.map((column) => (
          <div key={column.key} className="flex-shrink-0 w-72" role="listitem">
            <div className="flex items-center justify-between mb-2 px-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm">{column.label}</h3>
                <Badge variant="secondary">{column.count}</Badge>
              </div>
              <span className="text-xs text-muted-foreground">{formatCurrency(column.totalValue)}</span>
            </div>
            <Droppable droppableId={column.key}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`space-y-2 rounded-md p-2 min-h-[120px] transition-colors ${
                    snapshot.isDraggingOver ? 'bg-muted/60' : 'bg-muted/20'
                  }`}
                >
                  {column.leads.map((lead, index) => (
                    <Draggable key={lead.id} draggableId={lead.id} index={index}>
                      {(dragProvided, dragSnapshot) => (
                        <Card
                          ref={dragProvided.innerRef}
                          {...dragProvided.draggableProps}
                          {...dragProvided.dragHandleProps}
                          onClick={() => onLeadClick?.(lead.id)}
                          className={`cursor-pointer ${TIER_BORDER[valueTier(lead.estimated_budget)]} ${
                            dragSnapshot.isDragging ? 'shadow-lg' : ''
                          }`}
                        >
                          <CardContent className="p-3 space-y-1">
                            <div className="font-medium text-sm">{leadDisplayName(lead)}</div>
                            {lead.company_name && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Building2 className="h-3 w-3" aria-hidden="true" />
                                {lead.company_name}
                              </div>
                            )}
                            <div className="flex items-center justify-between text-xs pt-1">
                              <span className="flex items-center gap-1 font-semibold text-construction-orange">
                                <DollarSign className="h-3 w-3" aria-hidden="true" />
                                {formatCurrency(lead.estimated_budget ?? 0)}
                              </span>
                              <span className="flex items-center gap-1 text-muted-foreground">
                                <Clock className="h-3 w-3" aria-hidden="true" />
                                {daysInStage(lead)}d
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                  {column.leads.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">Drop leads here</p>
                  )}
                </div>
              )}
            </Droppable>
          </div>
        ))}
      </div>
    </DragDropContext>
  );
};

export default LeadsKanbanBoard;

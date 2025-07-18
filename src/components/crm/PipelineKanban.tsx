import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { formatCurrency } from '@/utils/formatters';
import { 
  DollarSign, 
  Calendar, 
  User, 
  Building2,
  Plus,
  MoreHorizontal
} from 'lucide-react';

interface PipelineStage {
  id: string;
  name: string;
  order_number: number;
  color: string;
  statusValue?: string;
}

interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  company_name?: string;
  project_name?: string;
  estimated_budget?: number;
  status: string;
  priority: string;
  next_follow_up_date?: string;
  created_at: string;
}

interface PipelineKanbanProps {
  onLeadClick: (leadId: string) => void;
}

export const PipelineKanban: React.FC<PipelineKanbanProps> = ({ onLeadClick }) => {
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [leadsByStage, setLeadsByStage] = useState<Record<string, Lead[]>>({});
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadPipelineData();
  }, []);

  const loadPipelineData = async () => {
    try {
      // Load pipeline stages - get user's company stages
      const { data: stagesData, error: stagesError } = await supabase
        .from('pipeline_stages')
        .select('*')
        .order('stage_order');

      if (stagesError) throw stagesError;

      // Map stages data to match our interface, using proper status values
      const mappedStages = stagesData?.map(stage => ({
        id: stage.id,
        name: stage.name,
        order_number: stage.stage_order,
        color: stage.color_code?.replace('#', '') || 'blue', // Remove # from hex color
        statusValue: stage.name.toLowerCase().replace(/\s+/g, '_') // Convert name to status value
      })) || [];

      // Create status mapping for consistent terminology
      const statusMapping = {
        'initial_contact': 'new',
        'qualification': 'contacted', 
        'proposal': 'qualified',
        'negotiation': 'proposal_sent',
        'contract_review': 'negotiating',
        'closed_won': 'won',
        'closed_lost': 'lost'
      };

      // If no custom stages, use default ones with proper mapping
      const defaultStages = mappedStages.length > 0 ? mappedStages.map(stage => ({
        ...stage,
        statusValue: statusMapping[stage.statusValue as keyof typeof statusMapping] || stage.statusValue
      })) : [
        { id: 'new', name: 'New Leads', order_number: 1, color: 'blue', statusValue: 'new' },
        { id: 'contacted', name: 'Contacted', order_number: 2, color: 'yellow', statusValue: 'contacted' },
        { id: 'qualified', name: 'Qualified', order_number: 3, color: 'green', statusValue: 'qualified' },
        { id: 'proposal_sent', name: 'Proposal Sent', order_number: 4, color: 'purple', statusValue: 'proposal_sent' },
        { id: 'negotiating', name: 'Negotiating', order_number: 5, color: 'orange', statusValue: 'negotiating' },
        { id: 'won', name: 'Won', order_number: 6, color: 'emerald', statusValue: 'won' },
        { id: 'lost', name: 'Lost', order_number: 7, color: 'red', statusValue: 'lost' }
      ];

      setStages(defaultStages);

      // Load leads
      const { data: leadsData, error: leadsError } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (leadsError) throw leadsError;

      // Group leads by stage using proper status mapping
      const grouped = defaultStages.reduce((acc, stage) => {
        const statusToMatch = stage.statusValue || stage.id;
        acc[stage.id] = leadsData?.filter(lead => lead.status === statusToMatch) || [];
        return acc;
      }, {} as Record<string, Lead[]>);

      setLeadsByStage(grouped);
    } catch (error: any) {
      toast({
        title: "Error loading pipeline data",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = async (result: any) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const sourceStageId = source.droppableId;
    const destStageId = destination.droppableId;
    const leadId = draggableId;

    // Update lead status in database
    try {
      const destStage = stages.find(s => s.id === destStageId);
      const newStatus = destStage?.statusValue || destStageId;
      
      const { error } = await supabase
        .from('leads')
        .update({ status: newStatus })
        .eq('id', leadId);

      if (error) throw error;

      // Update local state
      const sourceLeads = Array.from(leadsByStage[sourceStageId]);
      const destLeads = Array.from(leadsByStage[destStageId]);
      const [movedLead] = sourceLeads.splice(source.index, 1);
      
      movedLead.status = newStatus;
      destLeads.splice(destination.index, 0, movedLead);

      setLeadsByStage({
        ...leadsByStage,
        [sourceStageId]: sourceLeads,
        [destStageId]: destLeads
      });

      toast({
        title: "Lead moved successfully",
        description: `Lead moved to ${stages.find(s => s.id === destStageId)?.name}`
      });
    } catch (error: any) {
      toast({
        title: "Error moving lead",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: 'border-green-500',
      medium: 'border-yellow-500',
      high: 'border-orange-500',
      urgent: 'border-red-500'
    };
    return colors[priority as keyof typeof colors] || 'border-gray-500';
  };

  const getStageColor = (color: string) => {
    const colors = {
      blue: 'bg-blue-100 text-blue-800',
      yellow: 'bg-yellow-100 text-yellow-800',
      green: 'bg-green-100 text-green-800',
      purple: 'bg-purple-100 text-purple-800',
      orange: 'bg-orange-100 text-orange-800',
      emerald: 'bg-emerald-100 text-emerald-800',
      red: 'bg-red-100 text-red-800'
    };
    return colors[color as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return <div className="p-6">Loading pipeline...</div>;
  }

  return (
    <div className="h-full w-full overflow-hidden">
      <DragDropContext onDragEnd={handleDragEnd}>
        {/* Mobile: Vertical Stack */}
        <div className="block md:hidden space-y-4 max-w-full">
          {stages.map((stage) => (
            <Card key={stage.id} className="w-full">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">
                    <Badge className={getStageColor(stage.color)}>
                      {stage.name}
                    </Badge>
                  </CardTitle>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-muted-foreground">
                      {leadsByStage[stage.id]?.length || 0}
                    </span>
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  Total Value: {formatCurrency(
                    leadsByStage[stage.id]?.reduce((sum, lead) => sum + (lead.estimated_budget || 0), 0) || 0
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <Droppable droppableId={stage.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`space-y-2 min-h-[120px] ${
                        snapshot.isDraggingOver ? 'bg-muted/50 rounded-md' : ''
                      }`}
                    >
                      {leadsByStage[stage.id]?.map((lead, index) => (
                        <Draggable key={lead.id} draggableId={lead.id} index={index}>
                          {(provided, snapshot) => (
                            <Card
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`cursor-pointer transition-shadow hover:shadow-md border-l-4 ${getPriorityColor(lead.priority)} ${
                                snapshot.isDragging ? 'shadow-lg' : ''
                              }`}
                              onClick={() => onLeadClick(lead.id)}
                            >
                              <CardContent className="p-3">
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <h4 className="font-medium text-sm truncate">
                                      {lead.first_name} {lead.last_name}
                                    </h4>
                                    <Button variant="ghost" size="icon" className="h-4 w-4">
                                      <MoreHorizontal className="h-3 w-3" />
                                    </Button>
                                  </div>
                                  
                                  <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                                    <Building2 className="h-3 w-3" />
                                    <span className="truncate">
                                      {lead.company_name || lead.project_name || 'Individual'}
                                    </span>
                                  </div>

                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-1 text-xs">
                                      <DollarSign className="h-3 w-3 text-green-600" />
                                      <span className="font-medium">
                                        {formatCurrency(lead.estimated_budget || 0)}
                                      </span>
                                    </div>
                                    <Badge variant="outline" className="text-xs">
                                      {lead.priority}
                                    </Badge>
                                  </div>

                                  {lead.next_follow_up_date && (
                                    <div className="flex items-center space-x-1 text-xs text-orange-600">
                                      <Calendar className="h-3 w-3" />
                                      <span>
                                        {new Date(lead.next_follow_up_date).toLocaleDateString()}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Desktop: Horizontal Kanban */}
        <div className="hidden md:flex space-x-4 overflow-x-auto pb-4 min-h-0">
          {stages.map((stage) => (
            <div key={stage.id} className="min-w-[300px] flex-shrink-0">
              <Card className="h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">
                      <Badge className={getStageColor(stage.color)}>
                        {stage.name}
                      </Badge>
                    </CardTitle>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-muted-foreground">
                        {leadsByStage[stage.id]?.length || 0}
                      </span>
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Total Value: {formatCurrency(
                      leadsByStage[stage.id]?.reduce((sum, lead) => sum + (lead.estimated_budget || 0), 0) || 0
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <Droppable droppableId={stage.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`space-y-3 min-h-[200px] ${
                          snapshot.isDraggingOver ? 'bg-muted/50 rounded-md' : ''
                        }`}
                      >
                        {leadsByStage[stage.id]?.map((lead, index) => (
                          <Draggable key={lead.id} draggableId={lead.id} index={index}>
                            {(provided, snapshot) => (
                              <Card
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`cursor-pointer transition-shadow hover:shadow-md border-l-4 ${getPriorityColor(lead.priority)} ${
                                  snapshot.isDragging ? 'shadow-lg' : ''
                                }`}
                                onClick={() => onLeadClick(lead.id)}
                              >
                                <CardContent className="p-3">
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                      <h4 className="font-medium text-sm truncate">
                                        {lead.first_name} {lead.last_name}
                                      </h4>
                                      <Button variant="ghost" size="icon" className="h-4 w-4">
                                        <MoreHorizontal className="h-3 w-3" />
                                      </Button>
                                    </div>
                                    
                                    <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                                      <Building2 className="h-3 w-3" />
                                      <span className="truncate">
                                        {lead.company_name || lead.project_name || 'Individual'}
                                      </span>
                                    </div>

                                    <div className="flex items-center space-x-1 text-xs">
                                      <DollarSign className="h-3 w-3 text-green-600" />
                                      <span className="font-medium">
                                        {formatCurrency(lead.estimated_budget || 0)}
                                      </span>
                                    </div>

                                    {lead.next_follow_up_date && (
                                      <div className="flex items-center space-x-1 text-xs text-orange-600">
                                        <Calendar className="h-3 w-3" />
                                        <span>
                                          Follow-up: {new Date(lead.next_follow_up_date).toLocaleDateString()}
                                        </span>
                                      </div>
                                    )}

                                    <div className="flex items-center justify-between">
                                      <Badge variant="outline" className="text-xs">
                                        {lead.priority}
                                      </Badge>
                                      <span className="text-xs text-muted-foreground">
                                        {new Date(lead.created_at).toLocaleDateString()}
                                      </span>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
};
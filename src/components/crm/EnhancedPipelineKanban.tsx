/**
 * Enhanced Pipeline Kanban
 * Drag-and-drop visual pipeline for managing leads and opportunities
 * Real-time updates with value tracking
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DollarSign,
  Calendar,
  Phone,
  Mail,
  Building,
  TrendingUp,
  Plus
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface Lead {
  id: string;
  company_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  estimated_value: number;
  stage: string;
  created_at: string;
  last_contact: string;
  priority: 'low' | 'medium' | 'high';
}

interface PipelineStage {
  id: string;
  name: string;
  color: string;
}

interface EnhancedPipelineKanbanProps {
  onLeadClick?: (lead: Lead) => void;
  onNewLead?: () => void;
}

export const EnhancedPipelineKanban: React.FC<EnhancedPipelineKanbanProps> = ({
  onLeadClick,
  onNewLead
}) => {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedLead, setDraggedLead] = useState<Lead | null>(null);

  const stages: PipelineStage[] = [
    { id: 'new', name: 'New', color: 'bg-gray-100' },
    { id: 'contacted', name: 'Contacted', color: 'bg-blue-100' },
    { id: 'qualified', name: 'Qualified', color: 'bg-purple-100' },
    { id: 'proposal', name: 'Proposal', color: 'bg-yellow-100' },
    { id: 'negotiation', name: 'Negotiation', color: 'bg-orange-100' },
    { id: 'won', name: 'Won', color: 'bg-green-100' }
  ];

  useEffect(() => {
    loadLeads();
  }, []);

  const loadLeads = async () => {
    if (!userProfile?.company_id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('company_id', userProfile.company_id)
        .neq('stage', 'lost')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeads(data || []);
    } catch (error) {
      console.error('Error loading leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = async (newStage: string) => {
    if (!draggedLead) return;

    try {
      const { error } = await supabase
        .from('leads')
        .update({ stage: newStage })
        .eq('id', draggedLead.id);

      if (error) throw error;

      setLeads(leads.map(lead =>
        lead.id === draggedLead.id ? { ...lead, stage: newStage } : lead
      ));

      toast({ title: 'Lead Updated' });
    } finally {
      setDraggedLead(null);
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

      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages.map(stage => {
          const stageLeads = leads.filter(l => l.stage === stage.id);
          return (
            <div
              key={stage.id}
              className="flex-shrink-0 w-80"
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
                      <h4 className="font-semibold">{lead.company_name}</h4>
                      <p className="text-sm text-muted-foreground">{lead.contact_name}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <DollarSign className="h-4 w-4" />
                        {formatCurrency(lead.estimated_value || 0)}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default EnhancedPipelineKanban;

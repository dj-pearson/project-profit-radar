import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/utils/formatters';
import { 
  Star, 
  TrendingUp, 
  TrendingDown, 
  Target,
  DollarSign,
  Calendar,
  Activity,
  RefreshCw
} from 'lucide-react';

interface LeadScore {
  id: string;
  lead_id: string;
  score: number;
  score_factors: Record<string, number>;
  calculated_at: string;
  lead: {
    first_name: string;
    last_name: string;
    company_name?: string;
    estimated_budget?: number;
    status: string;
    priority: string;
    created_at: string;
  };
}

interface LeadScoringProps {
  leadId?: string;
  showTopLeads?: boolean;
  limit?: number;
}

export const LeadScoring: React.FC<LeadScoringProps> = ({ 
  leadId, 
  showTopLeads = false, 
  limit = 10 
}) => {
  const [leadScores, setLeadScores] = useState<LeadScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadLeadScores();
  }, [leadId, showTopLeads]);

  const loadLeadScores = async () => {
    try {
      let query = supabase
        .from('lead_scores')
        .select(`
          *,
          lead:leads(
            first_name,
            last_name,
            company_name,
            estimated_budget,
            status,
            priority,
            created_at
          )
        `)
        .order('score', { ascending: false });

      if (leadId) {
        query = query.eq('lead_id', leadId);
      } else if (showTopLeads) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) throw error;
      setLeadScores(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading lead scores",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const recalculateScore = async (targetLeadId: string) => {
    setCalculating(true);
    try {
      const { data, error } = await supabase.rpc('calculate_lead_score', {
        p_lead_id: targetLeadId
      });

      if (error) throw error;

      toast({
        title: "Score recalculated",
        description: `New score: ${data}`
      });

      // Reload scores
      await loadLeadScores();
    } catch (error: any) {
      toast({
        title: "Error calculating score",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setCalculating(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    if (score >= 40) return 'text-orange-600 bg-orange-100';
    return 'text-red-600 bg-red-100';
  };

  const getScoreGrade = (score: number) => {
    if (score >= 90) return 'A+';
    if (score >= 80) return 'A';
    if (score >= 70) return 'B';
    if (score >= 60) return 'C';
    if (score >= 50) return 'D';
    return 'F';
  };

  const getScoreFactorIcon = (factor: string) => {
    const icons = {
      budget_score: DollarSign,
      status_score: Target,
      priority_score: Star,
      activity_score: Activity,
      recency_score: Calendar,
    };
    const IconComponent = icons[factor as keyof typeof icons] || Star;
    return <IconComponent className="h-4 w-4" />;
  };

  const getScoreFactorLabel = (factor: string) => {
    const labels = {
      budget_score: 'Budget Value',
      status_score: 'Pipeline Stage',
      priority_score: 'Priority Level',
      activity_score: 'Engagement',
      recency_score: 'Recency',
    };
    return labels[factor as keyof typeof labels] || factor;
  };

  if (loading) {
    return <div className="p-6">Loading lead scores...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Star className="h-5 w-5" />
              <span>Lead Scoring</span>
            </CardTitle>
            <CardDescription>
              AI-powered lead quality assessment
            </CardDescription>
          </div>
          {leadId && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => recalculateScore(leadId)}
              disabled={calculating}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${calculating ? 'animate-spin' : ''}`} />
              Recalculate
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {leadScores.length === 0 ? (
          <div className="text-center py-8">
            <Star className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No scores available</h3>
            <p className="text-muted-foreground mb-4">
              Lead scores will appear here once calculated
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {leadScores.map((scoreData) => (
              <div key={scoreData.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${getScoreColor(scoreData.score)}`}>
                      {getScoreGrade(scoreData.score)}
                    </div>
                    <div>
                      <h4 className="font-medium">
                        {scoreData.lead.first_name} {scoreData.lead.last_name}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {scoreData.lead.company_name || 'Individual'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">{scoreData.score}</div>
                    <div className="text-sm text-muted-foreground">out of 100</div>
                  </div>
                </div>

                <div className="mb-4">
                  <Progress value={scoreData.score} className="h-2" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(scoreData.score_factors).map(([factor, value]) => (
                    <div key={factor} className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-2">
                        {getScoreFactorIcon(factor)}
                        <span>{getScoreFactorLabel(factor)}</span>
                      </div>
                      <Badge variant="outline">
                        {typeof value === 'number' ? value.toFixed(0) : value}
                      </Badge>
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Status: {scoreData.lead.status}</span>
                    <span>Budget: {formatCurrency(scoreData.lead.estimated_budget || 0)}</span>
                    <span>Priority: {scoreData.lead.priority}</span>
                  </div>
                </div>

                <div className="mt-2 text-xs text-muted-foreground">
                  Last calculated: {new Date(scoreData.calculated_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
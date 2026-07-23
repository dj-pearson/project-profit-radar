import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/states';
import { PipelineKanban } from '@/components/crm/PipelineKanban';
import {
  Users,
  Target,
  Phone,
  Mail,
  BarChart3,
} from 'lucide-react';
import type { Lead, Opportunity } from '@/pages/CRMDashboard';

interface CRMOverviewTabProps {
  leads: Lead[];
  opportunities: Opportunity[];
  onLeadClick: (leadId: string) => void;
  onSwitchTab: (tab: string) => void;
  getStatusColorClass: (status: string) => string;
  getPriorityColorClass: (priority: string) => string;
  getStageColorClass: (stage: string) => string;
  formatCurrency: (amount: number) => string;
  formatDate: (dateString: string) => string;
}

export const CRMOverviewTab: React.FC<CRMOverviewTabProps> = ({
  leads,
  opportunities,
  onLeadClick,
  onSwitchTab,
  getStatusColorClass,
  getPriorityColorClass,
  getStageColorClass,
  formatCurrency,
  formatDate,
}) => {
  return (
    <div className="space-y-6">
      {/* Pipeline Kanban - Primary Feature */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
          <div>
            <CardTitle className="flex items-center text-lg sm:text-xl">
              <Target className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-primary" aria-hidden="true" />
              Sales Pipeline
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">Visual overview of your opportunities and deals</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => onSwitchTab('opportunities')} className="w-full sm:w-auto">
            <BarChart3 className="h-4 w-4 mr-2" aria-hidden="true" />
            <span className="hidden sm:inline">View Full Pipeline</span>
            <span className="sm:hidden">Pipeline</span>
          </Button>
        </CardHeader>
        <CardContent className="p-2 sm:p-6">
          <div className="overflow-x-auto">
            <div className="min-w-0 max-w-full">
              <PipelineKanban onLeadClick={onLeadClick} />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">

        {/* Lead Scoring - AI Feature */}
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
            <div>
              <CardTitle className="flex items-center text-base sm:text-lg">
                <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-primary" aria-hidden="true" />
                Top Scoring Leads
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">AI-powered lead prioritization</CardDescription>
            </div>
            <Button size="sm" onClick={() => onSwitchTab('leads')} className="w-full sm:w-auto">
              <span className="hidden sm:inline">View All Scores</span>
              <span className="sm:hidden">All Scores</span>
            </Button>
          </CardHeader>
          <CardContent className="p-2 sm:p-6">
            {!leads?.length ? (
              <EmptyState
                icon={Users}
                title="No leads yet"
                description="Start building your sales pipeline by adding your first lead."
                action={{
                  label: "Add First Lead",
                  onClick: () => onSwitchTab('leads')
                }}
              />
            ) : (
              <div className="space-y-4">
                {leads.slice(0, 5).map((lead) => (
                  <div key={lead.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors" role="article" aria-labelledby={`lead-overview-${lead.id}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <p id={`lead-overview-${lead.id}`} className="font-medium truncate">
                          {lead.first_name} {lead.last_name}
                        </p>
                       <Badge variant="outline" className={getStatusColorClass(lead.status)} aria-label={`Status: ${lead.status}`}>
                         {lead.status}
                       </Badge>
                       <Badge variant="outline" className={getPriorityColorClass(lead.priority)} aria-label={`Priority: ${lead.priority}`}>
                         {lead.priority}
                       </Badge>
                      </div>
                     <p className="text-sm text-muted-foreground truncate">
                       {lead.company_name || 'No company'}
                     </p>
                     <p className="text-xs text-muted-foreground">
                       Source: {lead.lead_source}
                     </p>
                    </div>
                    <div className="flex flex-col items-end space-y-1">
                      <div className="flex space-x-2">
                        {lead.phone && (
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" aria-label={`Call ${lead.first_name} ${lead.last_name}`}>
                            <Phone className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        )}
                        {lead.email && (
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" aria-label={`Email ${lead.first_name} ${lead.last_name}`}>
                            <Mail className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(lead.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pipeline Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Sales Pipeline</CardTitle>
            <CardDescription>Opportunities by stage</CardDescription>
          </CardHeader>
          <CardContent>
            {!opportunities?.length ? (
              <EmptyState
                icon={Target}
                title="No opportunities"
                description="Create opportunities from qualified leads to track your sales pipeline."
              />
            ) : (
              <div className="space-y-4">
                {opportunities.slice(0, 5).map((opportunity) => (
                  <div key={opportunity.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors" role="article" aria-labelledby={`opp-overview-${opportunity.id}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <p id={`opp-overview-${opportunity.id}`} className="font-medium truncate">{opportunity.name}</p>
                       <Badge variant="outline" className={getStageColorClass(opportunity.stage)} aria-label={`Stage: ${opportunity.stage}`}>
                         {opportunity.stage}
                       </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {opportunity.project_type || 'General Construction'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(opportunity.estimated_value)}</p>
                      <p className="text-sm text-muted-foreground">{opportunity.probability_percent}% likely</p>
                      {opportunity.expected_close_date && (
                        <p className="text-xs text-muted-foreground">
                          Close: {formatDate(opportunity.expected_close_date)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmptyState } from '@/components/ui/states';
import { LeadEditDialog } from '@/components/crm/LeadEditDialog';
import { mobileFilterClasses, mobileButtonClasses } from '@/utils/mobileHelpers';
import {
  Users,
  Search,
  Plus,
} from 'lucide-react';
import type { Lead } from '@/pages/CRMDashboard';

interface CRMLeadsTabProps {
  filteredLeads: Lead[];
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  sourceFilter: string;
  onSourceFilterChange: (value: string) => void;
  onUpdateLead: (leadId: string, updates: Partial<Lead>) => void;
  getStatusColorClass: (status: string) => string;
  getPriorityColorClass: (priority: string) => string;
  formatDate: (dateString: string) => string;
}

export const CRMLeadsTab: React.FC<CRMLeadsTabProps> = ({
  filteredLeads,
  searchTerm,
  onSearchTermChange,
  statusFilter,
  onStatusFilterChange,
  sourceFilter,
  onSourceFilterChange,
  onUpdateLead,
  getStatusColorClass,
  getPriorityColorClass,
  formatDate,
}) => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className={mobileFilterClasses.container} role="search" aria-label="Search and filter leads">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <Input
                  placeholder="Search leads..."
                  value={searchTerm}
                  onChange={(e) => onSearchTermChange(e.target.value)}
                  className="pl-10"
                  aria-label="Search leads by name, email, or company"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={onStatusFilterChange}>
              <SelectTrigger className={mobileFilterClasses.input}>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="qualified">Qualified</SelectItem>
                <SelectItem value="proposal_sent">Proposal Sent</SelectItem>
                <SelectItem value="negotiating">Negotiating</SelectItem>
                <SelectItem value="won">Won</SelectItem>
                <SelectItem value="lost">Lost</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sourceFilter} onValueChange={onSourceFilterChange}>
              <SelectTrigger className={mobileFilterClasses.input}>
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="referral">Referral</SelectItem>
                <SelectItem value="website">Website</SelectItem>
                <SelectItem value="social_media">Social Media</SelectItem>
                <SelectItem value="google_ads">Google Ads</SelectItem>
                <SelectItem value="direct_mail">Direct Mail</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            {/* /crm/leads, not /crm/leads/new. No route declares the latter, and
                /crm/leads/:id matches it - so this opened the lead DETAIL view for a
                lead whose id is the string 'new'. Creation lives in the add-lead
                dialog on the /crm/leads page; LeadEditDialog here requires an
                existing lead and has no create mode. */}
            <Button className={mobileButtonClasses.primary} onClick={() => { navigate('/crm/leads'); }} aria-label="Add new lead">
              <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
              New Lead
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Leads List */}
      <Card>
        <CardHeader>
          <CardTitle>Leads ({filteredLeads.length})</CardTitle>
          <CardDescription>Manage your construction leads and prospects</CardDescription>
        </CardHeader>
        <CardContent>
          {!filteredLeads.length ? (
            <EmptyState
              icon={Users}
              title="No leads found"
              description="No leads match your current filters."
            />
          ) : (
            <div className="space-y-2">
              {filteredLeads.map((lead) => (
                <LeadEditDialog key={lead.id} lead={lead} onUpdate={onUpdateLead}>
                  <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {lead.first_name} {lead.last_name}
                          </p>
                          <p className="text-sm text-muted-foreground truncate">
                            {lead.email} • {lead.phone}
                          </p>
                        </div>
                        <div className="flex flex-col items-center space-y-1">
                         <Badge variant="outline" className={getStatusColorClass(lead.status)} aria-label={`Status: ${lead.status}`}>
                           {lead.status}
                         </Badge>
                         <Badge variant="outline" className={getPriorityColorClass(lead.priority)} aria-label={`Priority: ${lead.priority}`}>
                           {lead.priority}
                         </Badge>
                        </div>
                      </div>
                     <div className="mt-2">
                       <p className="text-sm font-medium">
                         {lead.company_name || 'No company specified'}
                       </p>
                       <p className="text-sm text-muted-foreground">
                         Source: {lead.lead_source}
                       </p>
                     </div>
                    </div>
                   <div className="text-right space-y-1">
                     <p className="text-sm text-muted-foreground">Priority: {lead.priority}</p>
                     <p className="text-xs text-muted-foreground">Created: {formatDate(lead.created_at)}</p>

                     {/* LEAN Navigation: Quick action buttons */}
                     <div className="flex space-x-1 mt-2">
                       {['qualified', 'proposal_sent', 'negotiating'].includes(lead.status) && (
                         <Button
                           size="sm"
                           variant="outline"
                           className="text-xs px-2 py-1 h-6"
                           onClick={(e) => {
                             e.stopPropagation();
                             navigate(`/crm/opportunities?lead=${lead.id}&name=${encodeURIComponent(`${lead.first_name} ${lead.last_name} Project`)}`);
                           }}
                         >
                           Convert
                         </Button>
                       )}
                     </div>
                   </div>
                  </div>
                </LeadEditDialog>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

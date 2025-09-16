import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Users, Phone, Mail, Calendar, DollarSign, TrendingUp, 
  MapPin, Building, Clock, Star, MessageSquare, FileText
} from 'lucide-react';

interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company?: string;
  projectType: 'residential' | 'commercial' | 'industrial' | 'renovation';
  projectDescription: string;
  estimatedBudget: number;
  timeframe: 'immediate' | '1-3_months' | '3-6_months' | '6-12_months' | 'planning';
  status: 'new' | 'contacted' | 'qualified' | 'proposal_sent' | 'negotiating' | 'won' | 'lost';
  priority: 'low' | 'medium' | 'high' | 'hot';
  source: 'website' | 'referral' | 'social_media' | 'advertising' | 'trade_show' | 'cold_outreach';
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  assignedTo?: string;
  leadScore: number;
  createdDate: Date;
  lastContactDate?: Date;
  nextFollowUpDate?: Date;
  notes: string[];
  tags: string[];
  interactions: Interaction[];
}

interface Interaction {
  id: string;
  type: 'call' | 'email' | 'meeting' | 'proposal' | 'site_visit' | 'follow_up';
  date: Date;
  subject: string;
  description: string;
  outcome?: string;
  nextAction?: string;
  performedBy: string;
  duration?: number;
}

interface Pipeline {
  stage: Lead['status'];
  name: string;
  count: number;
  value: number;
  conversionRate: number;
}

export const LeadManagementCRM: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([
    {
      id: '1',
      firstName: 'John',
      lastName: 'Morrison',
      email: 'john.morrison@techcorp.com',
      phone: '(555) 123-4567',
      company: 'TechCorp Industries',
      projectType: 'commercial',
      projectDescription: 'New 50,000 sq ft manufacturing facility',
      estimatedBudget: 2500000,
      timeframe: '3-6_months',
      status: 'qualified',
      priority: 'hot',
      source: 'website',
      address: '123 Industrial Blvd',
      city: 'Riverside',
      state: 'CA',
      zipCode: '92501',
      assignedTo: 'Sarah Johnson',
      leadScore: 85,
      createdDate: new Date('2024-01-15'),
      lastContactDate: new Date('2024-01-20'),
      nextFollowUpDate: new Date('2024-02-05'),
      notes: [
        'Very interested in sustainable building practices',
        'Decision maker with budget authority',
        'Timeline flexible but wants to start by Q2'
      ],
      tags: ['high-value', 'green-building', 'manufacturing'],
      interactions: [
        {
          id: 'i1',
          type: 'call',
          date: new Date('2024-01-20'),
          subject: 'Initial consultation call',
          description: 'Discussed project requirements and timeline',
          outcome: 'Positive - requesting detailed proposal',
          nextAction: 'Prepare comprehensive proposal',
          performedBy: 'Sarah Johnson',
          duration: 45
        }
      ]
    },
    {
      id: '2',
      firstName: 'Maria',
      lastName: 'Rodriguez',
      email: 'maria.rodriguez@gmail.com',
      phone: '(555) 234-5678',
      projectType: 'residential',
      projectDescription: 'Kitchen and bathroom renovation',
      estimatedBudget: 85000,
      timeframe: '1-3_months',
      status: 'proposal_sent',
      priority: 'medium',
      source: 'referral',
      address: '456 Oak Street',
      city: 'Springfield',
      state: 'CA',
      zipCode: '90210',
      assignedTo: 'Mike Chen',
      leadScore: 72,
      createdDate: new Date('2024-01-10'),
      lastContactDate: new Date('2024-01-25'),
      nextFollowUpDate: new Date('2024-02-01'),
      notes: [
        'Referred by previous client (Johnson project)',
        'Budget confirmed, ready to proceed',
        'Wants to start after kids return to school'
      ],
      tags: ['referral', 'renovation', 'ready-to-buy'],
      interactions: [
        {
          id: 'i2',
          type: 'site_visit',
          date: new Date('2024-01-22'),
          subject: 'Site assessment and measurements',
          description: 'Measured spaces and discussed design preferences',
          outcome: 'Positive - client loves initial concepts',
          nextAction: 'Follow up on proposal',
          performedBy: 'Mike Chen',
          duration: 120
        }
      ]
    },
    {
      id: '3',
      firstName: 'David',
      lastName: 'Thompson',
      email: 'david.thompson@smallbiz.com',
      phone: '(555) 345-6789',
      company: 'Thompson Small Business',
      projectType: 'commercial',
      projectDescription: 'Office space renovation and expansion',
      estimatedBudget: 150000,
      timeframe: 'immediate',
      status: 'new',
      priority: 'high',
      source: 'advertising',
      assignedTo: 'Tom Wilson',
      leadScore: 65,
      createdDate: new Date('2024-01-28'),
      notes: [
        'Needs quick turnaround - lease expires soon',
        'Budget seems realistic for scope'
      ],
      tags: ['urgent', 'office-renovation'],
      interactions: []
    }
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = `${lead.firstName} ${lead.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (lead.company && lead.company.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || lead.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const getStatusColor = (status: Lead['status']) => {
    switch (status) {
      case 'new': return 'outline';
      case 'contacted': return 'secondary';
      case 'qualified': return 'default';
      case 'proposal_sent': return 'default';
      case 'negotiating': return 'secondary';
      case 'won': return 'default';
      case 'lost': return 'destructive';
      default: return 'outline';
    }
  };

  const getPriorityColor = (priority: Lead['priority']) => {
    switch (priority) {
      case 'low': return 'outline';
      case 'medium': return 'secondary';
      case 'high': return 'default';
      case 'hot': return 'destructive';
      default: return 'outline';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-orange-500';
    return 'text-gray-500';
  };

  const getTimeframeText = (timeframe: Lead['timeframe']) => {
    switch (timeframe) {
      case 'immediate': return 'Immediate';
      case '1-3_months': return '1-3 months';
      case '3-6_months': return '3-6 months';
      case '6-12_months': return '6-12 months';
      case 'planning': return 'Planning stage';
      default: return 'Not specified';
    }
  };

  const renderLeadCard = (lead: Lead) => {
    const scoreColor = getScoreColor(lead.leadScore);
    const daysSinceContact = lead.lastContactDate ? 
      Math.floor((new Date().getTime() - lead.lastContactDate.getTime()) / (1000 * 3600 * 24)) : null;

    return (
      <Card key={lead.id} className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4" />
              <h4 className="font-medium">{lead.firstName} {lead.lastName}</h4>
            </div>
            <p className="text-sm text-muted-foreground">{lead.company || 'Individual'}</p>
            <p className="text-xs text-muted-foreground capitalize">{lead.projectType} project</p>
          </div>
          
          <div className="flex flex-col items-end gap-1">
            <Badge variant={getStatusColor(lead.status)}>
              {lead.status.replace('_', ' ')}
            </Badge>
            <Badge variant={getPriorityColor(lead.priority)}>
              {lead.priority}
            </Badge>
          </div>
        </div>

        <div className="space-y-2 mb-3">
          <div className="flex items-center gap-2 text-sm">
            <Mail className="h-3 w-3" />
            <span>{lead.email}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Phone className="h-3 w-3" />
            <span>{lead.phone}</span>
          </div>
          {lead.address && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-3 w-3" />
              <span>{lead.city}, {lead.state}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm">
            <DollarSign className="h-3 w-3" />
            <span>${lead.estimatedBudget.toLocaleString()}</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Lead Score:</span>
            <span className={`font-medium ${scoreColor}`}>{lead.leadScore}/100</span>
          </div>
          <Progress value={lead.leadScore} className="h-2" />
          
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Timeframe: {getTimeframeText(lead.timeframe)}</span>
            {daysSinceContact !== null && (
              <span>{daysSinceContact}d since contact</span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-1 mt-2 mb-3">
          {lead.tags.slice(0, 3).map(tag => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
          {lead.tags.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{lead.tags.length - 3}
            </Badge>
          )}
        </div>

        <div className="flex gap-2 mt-3">
          <Button size="sm" variant="outline">
            <Phone className="h-3 w-3 mr-1" />
            Call
          </Button>
          <Button size="sm" variant="outline">
            <Mail className="h-3 w-3 mr-1" />
            Email
          </Button>
          <Button size="sm" variant="ghost">
            Details
          </Button>
        </div>
      </Card>
    );
  };

  const renderInteractionCard = (interaction: Interaction, leadId: string) => {
    const lead = leads.find(l => l.id === leadId);
    
    return (
      <Card key={interaction.id} className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <MessageSquare className="h-4 w-4" />
              <h4 className="font-medium">{interaction.subject}</h4>
            </div>
            <p className="text-sm text-muted-foreground">{lead?.firstName} {lead?.lastName}</p>
          </div>
          <Badge variant="outline" className="capitalize">
            {interaction.type.replace('_', ' ')}
          </Badge>
        </div>
        
        <div className="space-y-2 mb-3">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-3 w-3" />
            <span>{interaction.date.toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Users className="h-3 w-3" />
            <span>{interaction.performedBy}</span>
          </div>
          {interaction.duration && (
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-3 w-3" />
              <span>{interaction.duration} minutes</span>
            </div>
          )}
        </div>
        
        <div className="text-sm">
          <p className="mb-2">{interaction.description}</p>
          {interaction.outcome && (
            <div className="mb-2">
              <span className="text-muted-foreground">Outcome:</span>
              <p className="font-medium">{interaction.outcome}</p>
            </div>
          )}
          {interaction.nextAction && (
            <div>
              <span className="text-muted-foreground">Next Action:</span>
              <p className="font-medium">{interaction.nextAction}</p>
            </div>
          )}
        </div>
      </Card>
    );
  };

  // Calculate pipeline statistics
  const pipeline: Pipeline[] = [
    { stage: 'new', name: 'New Leads', count: 0, value: 0, conversionRate: 0 },
    { stage: 'contacted', name: 'Contacted', count: 0, value: 0, conversionRate: 0 },
    { stage: 'qualified', name: 'Qualified', count: 0, value: 0, conversionRate: 0 },
    { stage: 'proposal_sent', name: 'Proposal Sent', count: 0, value: 0, conversionRate: 0 },
    { stage: 'negotiating', name: 'Negotiating', count: 0, value: 0, conversionRate: 0 },
    { stage: 'won', name: 'Won', count: 0, value: 0, conversionRate: 0 },
    { stage: 'lost', name: 'Lost', count: 0, value: 0, conversionRate: 0 }
  ];

  leads.forEach(lead => {
    const stage = pipeline.find(p => p.stage === lead.status);
    if (stage) {
      stage.count++;
      stage.value += lead.estimatedBudget;
    }
  });

  const totalLeads = leads.length;
  const activeLeads = leads.filter(l => !['won', 'lost'].includes(l.status)).length;
  const wonLeads = leads.filter(l => l.status === 'won').length;
  const conversionRate = totalLeads > 0 ? ((wonLeads / totalLeads) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Lead Management & CRM</h2>
          <p className="text-muted-foreground">
            Track leads, manage relationships, and grow your business
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <FileText className="h-4 w-4 mr-2" />
            Import Leads
          </Button>
          <Button>
            <Users className="h-4 w-4 mr-2" />
            Add Lead
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Leads</p>
                <p className="text-2xl font-bold">{totalLeads}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Leads</p>
                <p className="text-2xl font-bold text-blue-600">{activeLeads}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Conversion Rate</p>
                <p className="text-2xl font-bold text-green-600">{conversionRate}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pipeline Value</p>
                <p className="text-2xl font-bold">${pipeline.reduce((s, p) => s + p.value, 0).toLocaleString()}</p>
              </div>
              <DollarSign className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 items-center">
            <Input
              placeholder="Search leads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border rounded-md"
            >
              <option value="all">All Statuses</option>
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="qualified">Qualified</option>
              <option value="proposal_sent">Proposal Sent</option>
              <option value="negotiating">Negotiating</option>
              <option value="won">Won</option>
              <option value="lost">Lost</option>
            </select>
            <select 
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-2 border rounded-md"
            >
              <option value="all">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="hot">Hot</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="leads" className="space-y-4">
        <TabsList>
          <TabsTrigger value="leads">Leads</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="interactions">Recent Interactions</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="leads">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredLeads.map(renderLeadCard)}
          </div>
        </TabsContent>

        <TabsContent value="pipeline">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Sales Pipeline</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {pipeline.filter(stage => stage.count > 0).map(stage => (
                <Card key={stage.stage}>
                  <CardContent className="p-4">
                    <h4 className="font-medium mb-2">{stage.name}</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Count:</span>
                        <span className="font-medium">{stage.count}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Value:</span>
                        <span className="font-medium">${stage.value.toLocaleString()}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="interactions">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Recent Interactions</h3>
              <Button>Log New Interaction</Button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {leads.flatMap(lead => 
                lead.interactions.map(interaction => renderInteractionCard(interaction, lead.id))
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Lead Sources</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {['website', 'referral', 'advertising', 'social_media'].map(source => {
                    const count = leads.filter(l => l.source === source).length;
                    const percentage = totalLeads > 0 ? (count / totalLeads) * 100 : 0;
                    return (
                      <div key={source}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="capitalize">{source.replace('_', ' ')}</span>
                          <span>{count} ({percentage.toFixed(0)}%)</span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Average Lead Score</span>
                    <span className="font-medium">
                      {(leads.reduce((s, l) => s + l.leadScore, 0) / totalLeads || 0).toFixed(0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Average Deal Size</span>
                    <span className="font-medium">
                      ${(leads.reduce((s, l) => s + l.estimatedBudget, 0) / totalLeads || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Response Time</span>
                    <span className="font-medium">2.3 hours</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Qualified Rate</span>
                    <span className="font-medium">68%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
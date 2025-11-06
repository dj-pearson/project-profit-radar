import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { 
  Search, Plus, Phone, Mail, Calendar, TrendingUp, Users, 
  DollarSign, Target, Clock, Star, AlertCircle, CheckCircle2,
  Building2, Home, Wrench, Eye, Edit, Archive
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Lead {
  id: string;
  company_id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  company_name?: string;
  job_title?: string;
  project_name?: string;
  project_type?: string;
  project_description?: string;
  project_address?: string;
  project_city?: string;
  project_state?: string;
  project_zip?: string;
  estimated_budget?: number;
  budget_range?: string;
  desired_start_date?: string;
  desired_completion_date?: string;
  timeline_flexibility?: string;
  lead_source: string;
  lead_source_detail?: string;
  status: string;
  priority: string;
  assigned_to?: string;
  property_type?: string;
  permits_required?: boolean;
  hoa_approval_needed?: boolean;
  financing_secured?: boolean;
  financing_type?: string;
  site_accessible?: boolean;
  site_conditions?: string;
  decision_maker?: boolean;
  decision_timeline?: string;
  next_follow_up_date?: string;
  last_contact_date?: string;
  notes?: string;
  tags?: string[];
  qualification_status?: string;
  qualification_date?: string;
  nurturing_status?: string;
  intent_signals?: any;
  lead_temperature?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

interface LeadStats {
  total_leads: number;
  new_leads: number;
  qualified_leads: number;
  opportunities: number;
  conversion_rate: number;
  average_score: number;
}

export function LeadTrackingDashboard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<LeadStats>({
    total_leads: 0,
    new_leads: 0,
    qualified_leads: 0,
    opportunities: 0,
    conversion_rate: 0,
    average_score: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [qualityFilter, setQualityFilter] = useState<string>("all");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchLeads();
    fetchStats();
  }, []);

  const fetchLeads = async () => {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeads((data as any) || []);
    } catch (error) {
      console.error('Error fetching leads:', error);
      toast({
        title: "Error",
        description: "Failed to load leads",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const { data: leadsData, error } = await supabase
        .from('leads')
        .select('status, created_at');

      if (error) throw error;

      const leads = leadsData || [];
      const total = leads.length;
      const newLeads = leads.filter(l => l.status === 'new').length;
      const qualified = leads.filter(l => l.status === 'qualified').length;
      const opportunities = leads.filter(l => l.status === 'proposal' || l.status === 'negotiation').length;
      const converted = 0; // Need to add conversion tracking
      const avgScore = 0; // Need to add scoring system

      setStats({
        total_leads: total,
        new_leads: newLeads,
        qualified_leads: qualified,
        opportunities,
        conversion_rate: total > 0 ? (converted / total) * 100 : 0,
        average_score: Math.round(avgScore),
      });
    } catch (error) {
      console.error('Error fetching lead stats:', error);
    }
  };

  const calculateScore = async (leadId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('calculate-lead-score', {
        body: { 
          leadId, 
          companyId: leads.find(l => l.id === leadId)?.company_id 
        }
      });

      if (error) throw error;

      toast({
        title: "Score Updated",
        description: `Lead score: ${data.score} points (${data.quality})`,
      });

      // Refresh leads to show updated score
      fetchLeads();
    } catch (error) {
      console.error('Error calculating lead score:', error);
      toast({
        title: "Error",
        description: "Failed to calculate lead score",
        variant: "destructive",
      });
    }
  };

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = 
      lead.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.project_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || lead.status === statusFilter;
    const matchesType = typeFilter === "all" || lead.project_type === typeFilter;
    const matchesQuality = qualityFilter === "all" || lead.qualification_status === qualityFilter;
    
    return matchesSearch && matchesStatus && matchesType && matchesQuality;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'contacted': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'qualified': return 'bg-green-100 text-green-800 border-green-300';
      case 'proposal_sent': return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'negotiating': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'won': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'lost': return 'bg-red-100 text-red-800 border-red-300';
      case 'on_hold': return 'bg-gray-100 text-gray-800 border-gray-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'unqualified': return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'marketing_qualified': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'sales_qualified': return 'bg-green-100 text-green-800 border-green-300';
      case 'opportunity': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'residential': return <Home className="h-4 w-4" />;
      case 'commercial': return <Building2 className="h-4 w-4" />;
      case 'specialty_trade': return <Wrench className="h-4 w-4" />;
      default: return <Target className="h-4 w-4" />;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600';
    if (score >= 60) return 'text-green-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-muted rounded animate-pulse" />
          ))}
        </div>
        <div className="h-96 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Lead Tracking & Qualification</h2>
          <p className="text-muted-foreground">
            Manage leads, track qualification, and optimize conversion rates
          </p>
        </div>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Lead
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Leads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-600" />
              <span className="text-2xl font-bold">{stats.total_leads}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">New Leads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <span className="text-2xl font-bold">{stats.new_leads}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Qualified</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-2xl font-bold">{stats.qualified_leads}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Opportunities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-600" />
              <span className="text-2xl font-bold">{stats.opportunities}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Conversion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-600" />
              <span className="text-2xl font-bold">{stats.conversion_rate.toFixed(1)}%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-indigo-600" />
              <span className="text-2xl font-bold">{stats.average_score}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search leads..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by status" />
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
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="residential">Residential</SelectItem>
            <SelectItem value="commercial">Commercial</SelectItem>
            <SelectItem value="specialty_trade">Specialty Trade</SelectItem>
            <SelectItem value="mixed">Mixed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={qualityFilter} onValueChange={setQualityFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by quality" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Qualities</SelectItem>
            <SelectItem value="unqualified">Unqualified</SelectItem>
            <SelectItem value="marketing_qualified">Marketing Qualified</SelectItem>
            <SelectItem value="sales_qualified">Sales Qualified</SelectItem>
            <SelectItem value="opportunity">Opportunity</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Leads Table */}
      <Card>
        <CardHeader>
          <CardTitle>Leads ({filteredLeads.length})</CardTitle>
          <CardDescription>
            All leads with qualification status and scoring
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredLeads.map((lead) => (
              <div
                key={lead.id}
                className="border rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      {getTypeIcon(lead.project_type || 'residential')}
                      <div>
                        <h3 className="font-semibold">
                          {lead.first_name} {lead.last_name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {lead.company_name || lead.project_name}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-lg font-bold text-muted-foreground">
                        N/A
                      </div>
                      <div className="text-xs text-muted-foreground">Score</div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Badge className={getStatusColor(lead.status)}>
                        {lead.status.replace('_', ' ')}
                      </Badge>
                      <Badge className={getQualityColor(lead.qualification_status || 'unqualified')} variant="outline">
                        {(lead.qualification_status || 'unqualified').replace('_', ' ')}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => calculateScore(lead.id)}
                      >
                        <Target className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedLead(lead)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center gap-4">
                    {lead.email && (
                      <div className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        <span>{lead.email}</span>
                      </div>
                    )}
                    {lead.phone && (
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        <span>{lead.phone}</span>
                      </div>
                    )}
                    {lead.estimated_budget && (
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        <span>${lead.estimated_budget.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>
                      {new Date(lead.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {lead.tags && lead.tags.length > 0 && (
                  <div className="mt-2 flex gap-1 flex-wrap">
                    {lead.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {filteredLeads.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No leads found matching your filters.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Lead Details Dialog */}
      {selectedLead && (
        <LeadDetailsDialog
          lead={selectedLead}
          open={!!selectedLead}
          onOpenChange={() => setSelectedLead(null)}
        />
      )}
    </div>
  );
}

interface LeadDetailsDialogProps {
  lead: Lead;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function LeadDetailsDialog({ lead, open, onOpenChange }: LeadDetailsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {lead.project_type === 'residential' ? <Home className="h-5 w-5" /> : 
             lead.project_type === 'commercial' ? <Building2 className="h-5 w-5" /> : 
             <Wrench className="h-5 w-5" />}
            {lead.first_name} {lead.last_name}
          </DialogTitle>
          <DialogDescription>
            {lead.company_name && `${lead.company_name} • `}
            {lead.project_name || 'Construction Lead'}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-6">
            {/* Lead Score and Quality */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">N/A</div>
                    <div className="text-sm text-muted-foreground">Lead Score</div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-center">
                    <Badge className="text-xs">{(lead.qualification_status || 'unqualified').replace('_', ' ')}</Badge>
                    <div className="text-sm text-muted-foreground mt-1">Quality</div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-center">
                    <Badge className="text-xs">{lead.status.replace('_', ' ')}</Badge>
                    <div className="text-sm text-muted-foreground mt-1">Status</div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-center">
                    <div className="text-lg font-semibold">
                      {lead.estimated_budget ? `$${lead.estimated_budget.toLocaleString()}` : 'N/A'}
                    </div>
                    <div className="text-sm text-muted-foreground">Budget</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Contact Information */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Contact Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Name</label>
                  <p>{lead.first_name} {lead.last_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Company</label>
                  <p>{lead.company_name || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email</label>
                  <p>{lead.email || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Phone</label>
                  <p>{lead.phone || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Project Details */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Project Details</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Project Name</label>
                  <p>{lead.project_name || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Description</label>
                  <p>{lead.project_description || 'N/A'}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Timeline</label>
                    <p>{lead.decision_timeline?.replace('_', ' ') || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Budget Range</label>
                    <p>{lead.budget_range || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Qualification Status */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Qualification Status</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  {lead.decision_maker ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-600" />
                  )}
                  <span>Decision Maker</span>
                </div>
                <div className="flex items-center gap-2">
                  {lead.financing_secured ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-600" />
                  )}
                  <span>Financing Secured</span>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button>
            Edit Lead
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
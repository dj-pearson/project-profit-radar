import { useState, useEffect } from "react";
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, Search, FileText, Users, Calendar, CheckCircle, AlertCircle, ArrowLeft, Edit } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export default function PublicProcurement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTab, setSelectedTab] = useState("opportunities");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [bidSubmissions, setBidSubmissions] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [editingOpportunity, setEditingOpportunity] = useState<any>(null);
  const { toast } = useToast();
  const { userProfile } = useAuth();

  const [formData, setFormData] = useState({
    opportunity_number: '',
    issuing_agency: '',
    title: '',
    description: '',
    procurement_type: '',
    estimated_value: '',
    submission_deadline: ''
  });

  const resetForm = () => {
    setFormData({
      opportunity_number: '',
      issuing_agency: '',
      title: '',
      description: '',
      procurement_type: '',
      estimated_value: '',
      submission_deadline: ''
    });
  };

  const handleSaveOpportunity = async () => {
    if (!userProfile?.company_id) {
      toast({
        title: "Error",
        description: "User profile not found",
        variant: "destructive"
      });
      return;
    }

    if (!formData.title || !formData.issuing_agency || !formData.opportunity_number) {
      toast({
        title: "Error", 
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    
    try {
      const opportunityData = {
        company_id: userProfile.company_id,
        opportunity_number: formData.opportunity_number,
        issuing_agency: formData.issuing_agency,
        title: formData.title,
        description: formData.description || null,
        procurement_type: formData.procurement_type || null,
        estimated_value: formData.estimated_value ? parseFloat(formData.estimated_value) : null,
        submission_deadline: formData.submission_deadline || null,
        ...(editingOpportunity ? {} : { status: 'open' })
      };

      let error;

      if (editingOpportunity) {
        const { error: updateError } = await supabase
          .from('procurement_opportunities')
          .update(opportunityData)
          .eq('id', editingOpportunity.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('procurement_opportunities')
          .insert([opportunityData]);
        error = insertError;
      }

      if (error) throw error;

      toast({
        title: "Success",
        description: editingOpportunity ? "Procurement opportunity updated successfully" : "Procurement opportunity saved successfully"
      });
      
      resetForm();
      setIsDialogOpen(false);
      setEditingOpportunity(null);
      loadOpportunities();
    } catch (error) {
      console.error('Error saving opportunity:', error);
      toast({
        title: "Error",
        description: "Failed to save opportunity. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditOpportunity = (opportunity: any) => {
    setEditingOpportunity(opportunity);
    setFormData({
      opportunity_number: opportunity.opportunity_number || '',
      issuing_agency: opportunity.issuing_agency || '',
      title: opportunity.title || '',
      description: opportunity.description || '',
      procurement_type: opportunity.procurement_type || '',
      estimated_value: opportunity.estimated_value ? opportunity.estimated_value.toString() : '',
      submission_deadline: opportunity.submission_deadline ? opportunity.submission_deadline.replace('Z', '').slice(0, 16) : ''
    });
    setIsDialogOpen(true);
  };

  const loadOpportunities = async () => {
    if (!userProfile?.company_id) return;
    
    try {
      const { data, error } = await supabase
        .from('procurement_opportunities')
        .select('*')
        .eq('company_id', userProfile.company_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOpportunities(data || []);
    } catch (error) {
      console.error('Error loading opportunities:', error);
      toast({
        title: "Error",
        description: "Failed to load opportunities",
        variant: "destructive"
      });
    }
  };

  const loadBidSubmissions = async () => {
    if (!userProfile?.company_id) return;
    
    try {
      const { data, error } = await supabase
        .from('bid_submissions')
        .select(`
          *,
          procurement_opportunities(title)
        `)
        .eq('company_id', userProfile.company_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const formattedData = data?.map(bid => ({
        ...bid,
        opportunity_title: bid.procurement_opportunities?.title || 'Unknown Opportunity'
      })) || [];
      
      setBidSubmissions(formattedData);
    } catch (error) {
      console.error('Error loading bid submissions:', error);
      toast({
        title: "Error", 
        description: "Failed to load bid submissions",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    if (userProfile?.company_id) {
      setDataLoading(true);
      Promise.all([loadOpportunities(), loadBidSubmissions()])
        .finally(() => setDataLoading(false));
    }
  }, [userProfile?.company_id]);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      open: { variant: "default" as const, label: "Open" },
      closed: { variant: "secondary" as const, label: "Closed" },
      awarded: { variant: "default" as const, label: "Awarded" },
      cancelled: { variant: "destructive" as const, label: "Cancelled" },
      preparing: { variant: "outline" as const, label: "Preparing" },
      submitted: { variant: "default" as const, label: "Submitted" },
      under_review: { variant: "secondary" as const, label: "Under Review" },
      not_awarded: { variant: "destructive" as const, label: "Not Awarded" }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig];
    return <Badge variant={config?.variant}>{config?.label || status}</Badge>;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <DashboardLayout title="Public Procurement">
      <div className="space-y-6">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Opportunity
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingOpportunity ? 'Edit Procurement Opportunity' : 'Add Procurement Opportunity'}</DialogTitle>
                <DialogDescription>
                  {editingOpportunity ? 'Update procurement opportunity details' : 'Track a new public procurement opportunity'}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="opportunity-number">Opportunity Number *</Label>
                    <Input 
                      id="opportunity-number" 
                      placeholder="RFP-2024-001"
                      value={formData.opportunity_number}
                      onChange={(e) => setFormData({...formData, opportunity_number: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="issuing-agency">Issuing Agency *</Label>
                    <Input 
                      id="issuing-agency" 
                      placeholder="City of Springfield"
                      value={formData.issuing_agency}
                      onChange={(e) => setFormData({...formData, issuing_agency: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="title">Title *</Label>
                  <Input 
                    id="title" 
                    placeholder="Project title"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea 
                    id="description" 
                    placeholder="Project description and scope"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="procurement-type">Procurement Type</Label>
                    <Select 
                      value={formData.procurement_type}
                      onValueChange={(value) => setFormData({...formData, procurement_type: value})}
                    >
                      <SelectTrigger id="procurement-type">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sealed_bid">Sealed Bid</SelectItem>
                        <SelectItem value="request_for_proposal">Request for Proposal</SelectItem>
                        <SelectItem value="request_for_qualifications">Request for Qualifications</SelectItem>
                        <SelectItem value="small_purchase">Small Purchase</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="estimated-value">Estimated Value</Label>
                    <Input 
                      id="estimated-value" 
                      type="number" 
                      placeholder="1000000"
                      value={formData.estimated_value}
                      onChange={(e) => setFormData({...formData, estimated_value: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="submission-deadline">Submission Deadline</Label>
                  <Input 
                    id="submission-deadline" 
                    type="datetime-local"
                    value={formData.submission_deadline}
                    onChange={(e) => setFormData({...formData, submission_deadline: e.target.value})}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setIsDialogOpen(false);
                      resetForm();
                      setEditingOpportunity(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSaveOpportunity}
                    disabled={loading}
                  >
                    {loading ? "Saving..." : "Save Opportunity"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
      </div>
      
      <div className="space-y-6">

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
          <TabsTrigger value="opportunities" className="text-xs sm:text-sm">Opportunities</TabsTrigger>
          <TabsTrigger value="bids" className="text-xs sm:text-sm">My Bids</TabsTrigger>
          <TabsTrigger value="subcontractors" className="text-xs sm:text-sm">Subcontractors</TabsTrigger>
          <TabsTrigger value="requirements" className="text-xs sm:text-sm">Requirements</TabsTrigger>
        </TabsList>

        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search opportunities, bids, or subcontractors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:max-w-sm"
            />
          </div>
        </div>

        <TabsContent value="opportunities" className="space-y-4">
          {dataLoading ? (
            <div className="text-center py-8">
              <div className="text-muted-foreground">Loading opportunities...</div>
            </div>
          ) : opportunities.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">No Opportunities Found</h3>
              <p className="text-muted-foreground mb-4">
                Add your first procurement opportunity to get started
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Opportunity
              </Button>
            </div>
          ) : (
            <div className="grid gap-4">
              {opportunities.map((opportunity) => (
                <Card key={opportunity.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <CardTitle className="text-lg">{opportunity.title}</CardTitle>
                        <CardDescription>
                          {opportunity.opportunity_number} • {opportunity.issuing_agency}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        {opportunity.is_watched && (
                          <Badge variant="outline">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Watching
                          </Badge>
                        )}
                        {getStatusBadge(opportunity.status)}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="font-medium text-muted-foreground">Type</div>
                        <div className="capitalize">{opportunity.procurement_type?.replace('_', ' ') || 'Not specified'}</div>
                      </div>
                      <div>
                        <div className="font-medium text-muted-foreground">Estimated Value</div>
                        <div>{opportunity.estimated_value ? formatCurrency(opportunity.estimated_value) : 'Not specified'}</div>
                      </div>
                      <div>
                        <div className="font-medium text-muted-foreground">Deadline</div>
                        <div>{opportunity.submission_deadline ? formatDate(opportunity.submission_deadline) : 'Not set'}</div>
                      </div>
                      <div>
                        <div className="font-medium text-muted-foreground">Location</div>
                        <div>{opportunity.project_location || 'Not specified'}</div>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row justify-end gap-2 mt-4">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleEditOpportunity(opportunity)}
                        className="w-full sm:w-auto"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button variant="outline" size="sm" className="w-full sm:w-auto">
                        <FileText className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                      <Button size="sm" className="w-full sm:w-auto">
                        <Plus className="h-4 w-4 mr-2" />
                        Submit Bid
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="bids" className="space-y-4">
          <div className="grid gap-4">
            {bidSubmissions.map((bid) => (
              <Card key={bid.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{bid.opportunity_title}</CardTitle>
                      <CardDescription>{bid.bid_number}</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {bid.ranking && (
                        <Badge variant="outline">Rank #{bid.ranking}</Badge>
                      )}
                      {getStatusBadge(bid.status)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="font-medium text-muted-foreground">Bid Amount</div>
                      <div className="text-lg font-semibold">{formatCurrency(bid.bid_amount)}</div>
                    </div>
                    {bid.submitted_at && (
                      <div>
                        <div className="font-medium text-muted-foreground">Submitted</div>
                        <div>{formatDate(bid.submitted_at)}</div>
                      </div>
                    )}
                    <div>
                      <div className="font-medium text-muted-foreground">Status</div>
                      <div className="capitalize">{bid.status.replace('_', ' ')}</div>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row justify-end gap-2 mt-4">
                    <Button variant="outline" size="sm" className="w-full sm:w-auto">
                      <Users className="h-4 w-4 mr-2" />
                      Subcontractors
                    </Button>
                    <Button variant="outline" size="sm" className="w-full sm:w-auto">
                      <FileText className="h-4 w-4 mr-2" />
                      Documents
                    </Button>
                    <Button size="sm" className="w-full sm:w-auto">
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Bid
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="subcontractors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Subcontractor Disclosures</CardTitle>
              <CardDescription>
                Manage required subcontractor disclosures for public procurement bids
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">No Subcontractor Disclosures</h3>
                <p className="text-muted-foreground mb-4">
                  Add subcontractor information required for bid submissions
                </p>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Subcontractor
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requirements" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
                  Compliance Tracking
                </CardTitle>
                <CardDescription>
                  Track procurement requirement compliance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span>License Requirements</span>
                    <Badge>Compliant</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Insurance Coverage</span>
                    <Badge>Compliant</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Bonding Capacity</span>
                    <Badge variant="secondary">Pending</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>MBE/WBE Certification</span>
                    <Badge variant="outline">Not Required</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="h-5 w-5 mr-2 text-blue-500" />
                  Upcoming Deadlines
                </CardTitle>
                <CardDescription>
                  Important dates and deadlines
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium">Highway Bridge Repair</div>
                      <div className="text-sm text-muted-foreground">Bid Submission</div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">Nov 30</div>
                      <div className="text-sm text-muted-foreground">3:00 PM</div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium">Convention Center</div>
                      <div className="text-sm text-muted-foreground">Pre-bid Meeting</div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">Dec 1</div>
                      <div className="text-sm text-muted-foreground">10:00 AM</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
      </div>
    </DashboardLayout>
  );
}
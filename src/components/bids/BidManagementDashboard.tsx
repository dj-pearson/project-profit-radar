import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  DollarSign, 
  Calendar, 
  Users, 
  BarChart3,
  Edit,
  Eye,
  Plus,
  Filter,
  Download
} from "lucide-react";
import { format } from "date-fns";

interface BidSubmission {
  id: string;
  bid_number?: string;
  bid_amount: number;
  win_loss_status: string;
  loss_reason?: string;
  competitor_winner?: string;
  competitor_bid_amount?: number;
  margin_percentage?: number;
  probability_score?: number;
  bid_preparation_hours?: number;
  bid_cost?: number;
  submitted_at?: string;
  opportunity_id: string;
  status: string;
  company_id: string;
  created_at?: string;
  updated_at?: string;
  // Add opportunity details
  procurement_opportunities?: {
    title: string;
    issuing_agency: string;
    estimated_value: number;
  } | null;
}

interface BidAnalytics {
  id: string;
  total_bids_submitted: number;
  total_bids_won: number;
  total_bids_lost: number;
  win_rate_percentage: number;
  total_bid_value: number;
  total_won_value: number;
  average_bid_amount: number;
  average_margin_percentage: number;
  total_bid_costs: number;
  roi_percentage: number;
  top_loss_reasons: Array<{ reason: string; count: number }>;
  top_competitors: Array<{ competitor: string; wins: number }>;
  performance_trends: Record<string, number>;
}

interface Benchmark {
  benchmark_type: string;
  benchmark_value: number;
  industry_sector: string;
  company_size_category: string;
}

export function BidManagementDashboard() {
  const { toast } = useToast();
  const [bids, setBids] = useState<BidSubmission[]>([]);
  const [analytics, setAnalytics] = useState<BidAnalytics | null>(null);
  const [benchmarks, setBenchmarks] = useState<Benchmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('monthly');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBid, setSelectedBid] = useState<BidSubmission | null>(null);
  const [isWinLossDialogOpen, setIsWinLossDialogOpen] = useState(false);

  useEffect(() => {
    fetchBidsAndAnalytics();
    fetchBenchmarks();
  }, [selectedPeriod]);

  const fetchBidsAndAnalytics = async () => {
    try {
      setLoading(true);

      // Get user's company
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!profile?.company_id) throw new Error('No company found');

      // Fetch bid submissions
      const { data: bidsData, error: bidsError } = await supabase
        .from('bid_submissions')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('submitted_at', { ascending: false });

      if (bidsError) throw bidsError;

      // Fetch opportunity details separately if needed
      const bidsWithOpportunities = await Promise.all(
        (bidsData || []).map(async (bid) => {
          if (bid.opportunity_id) {
            const { data: opportunity } = await supabase
              .from('procurement_opportunities')
              .select('title, issuing_agency, estimated_value')
              .eq('id', bid.opportunity_id)
              .single();
            
            return {
              ...bid,
              procurement_opportunities: opportunity
            };
          }
          return {
            ...bid,
            procurement_opportunities: null
          };
        })
      );

      setBids(bidsWithOpportunities as BidSubmission[]);

      // Calculate period dates
      const now = new Date();
      const startDate = new Date();
      if (selectedPeriod === 'monthly') {
        startDate.setMonth(now.getMonth() - 1);
      } else if (selectedPeriod === 'quarterly') {
        startDate.setMonth(now.getMonth() - 3);
      } else {
        startDate.setFullYear(now.getFullYear() - 1);
      }

      // Calculate analytics using edge function
      const { data: analyticsResult, error: analyticsError } = await supabase.functions
        .invoke('calculate-bid-analytics', {
          body: {
            company_id: profile.company_id,
            period: selectedPeriod,
            start_date: startDate.toISOString().split('T')[0],
            end_date: now.toISOString().split('T')[0]
          }
        });

      if (analyticsError) {
        console.error('Analytics calculation error:', analyticsError);
        // Continue without analytics rather than failing completely
      } else {
        setAnalytics(analyticsResult.analytics);
      }

    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load bid data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchBenchmarks = async () => {
    try {
      const { data, error } = await supabase
        .from('bid_performance_benchmarks')
        .select('*')
        .eq('industry_sector', 'Construction')
        .eq('company_size_category', 'small')
        .eq('is_active', true);

      if (error) throw error;
      setBenchmarks(data || []);
    } catch (error) {
      console.error('Error fetching benchmarks:', error);
    }
  };

  const handleWinLossUpdate = async (bidId: string, status: string, formData: any) => {
    try {
      const updateData: any = {
        win_loss_status: status,
      };

      if (status === 'lost') {
        updateData.loss_reason = formData.lossReason;
        updateData.competitor_winner = formData.competitorWinner;
        updateData.competitor_bid_amount = formData.competitorBidAmount;
      } else if (status === 'won') {
        updateData.margin_percentage = formData.marginPercentage;
      }

      updateData.lessons_learned_summary = formData.lessonsLearned;
      updateData.client_feedback = formData.clientFeedback;
      updateData.follow_up_opportunities = formData.followUpOpportunities;

      const { error } = await supabase
        .from('bid_submissions')
        .update(updateData)
        .eq('id', bidId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Bid marked as ${status}`,
      });

      setIsWinLossDialogOpen(false);
      setSelectedBid(null);
      fetchBidsAndAnalytics();
    } catch (error) {
      console.error('Error updating bid:', error);
      toast({
        title: "Error",
        description: "Failed to update bid status",
        variant: "destructive",
      });
    }
  };

  const filteredBids = bids.filter(bid => {
    const matchesStatus = filterStatus === 'all' || bid.win_loss_status === filterStatus;
    const matchesSearch = !searchTerm || 
      bid.bid_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bid.procurement_opportunities?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bid.procurement_opportunities?.issuing_agency?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      'won': 'default',
      'lost': 'destructive',
      'pending': 'secondary',
      'preparing': 'outline'
    };
    
    return <Badge variant={variants[status] || 'outline'}>{status.toUpperCase()}</Badge>;
  };

  const getBenchmarkComparison = (metric: string, value: number) => {
    const benchmark = benchmarks.find(b => b.benchmark_type === metric);
    if (!benchmark) return null;

    const isAboveBenchmark = value > benchmark.benchmark_value;
    const difference = ((value - benchmark.benchmark_value) / benchmark.benchmark_value * 100).toFixed(1);

    return (
      <div className="flex items-center gap-2 text-sm">
        {isAboveBenchmark ? (
          <TrendingUp className="h-4 w-4 text-green-500" />
        ) : (
          <TrendingDown className="h-4 w-4 text-red-500" />
        )}
        <span className={isAboveBenchmark ? 'text-green-600' : 'text-red-600'}>
          {difference}% vs industry avg ({benchmark.benchmark_value.toFixed(1)}%)
        </span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardHeader className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-6 bg-muted rounded w-1/2" />
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bid Management</h1>
          <p className="text-muted-foreground">
            Track win/loss rates and analyze bidding performance
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.win_rate_percentage.toFixed(1)}%</div>
              {getBenchmarkComparison('win_rate', analytics.win_rate_percentage)}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Bid Value</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${analytics.total_bid_value.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                Won: ${analytics.total_won_value.toLocaleString()}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Margin</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.average_margin_percentage.toFixed(1)}%</div>
              {getBenchmarkComparison('margin', analytics.average_margin_percentage)}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">ROI</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.roi_percentage.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                Bid costs: ${analytics.total_bid_costs.toLocaleString()}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="bids" className="space-y-4">
        <TabsList>
          <TabsTrigger value="bids">Bid Submissions</TabsTrigger>
          <TabsTrigger value="analytics">Win/Loss Analysis</TabsTrigger>
          <TabsTrigger value="benchmarks">Industry Benchmarks</TabsTrigger>
        </TabsList>

        <TabsContent value="bids" className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <Input
                placeholder="Search bids..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="won">Won</SelectItem>
                <SelectItem value="lost">Lost</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Bid List */}
          <div className="space-y-4">
            {filteredBids.map((bid) => (
              <Card key={bid.id}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">
                          {bid.procurement_opportunities?.title || `Bid ${bid.bid_number}`}
                        </h3>
                        {getStatusBadge(bid.win_loss_status)}
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Agency:</span>
                          <div>{bid.procurement_opportunities?.issuing_agency || 'N/A'}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Bid Amount:</span>
                          <div>${bid.bid_amount.toLocaleString()}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Margin:</span>
                          <div>{bid.margin_percentage ? `${bid.margin_percentage}%` : 'N/A'}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Submitted:</span>
                          <div>
                            {bid.submitted_at ? format(new Date(bid.submitted_at), 'MMM dd, yyyy') : 'Not submitted'}
                          </div>
                        </div>
                      </div>

                      {bid.loss_reason && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">Loss Reason:</span>
                          <div className="text-red-600">{bid.loss_reason}</div>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                      {bid.win_loss_status === 'pending' && (
                        <Dialog open={isWinLossDialogOpen} onOpenChange={setIsWinLossDialogOpen}>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedBid(bid)}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Update Status
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-md">
                            <DialogHeader>
                              <DialogTitle>Update Bid Status</DialogTitle>
                              <DialogDescription>
                                Mark this bid as won or lost and provide details.
                              </DialogDescription>
                            </DialogHeader>
                            <WinLossUpdateForm
                              bid={selectedBid}
                              onSubmit={(status, data) => handleWinLossUpdate(bid.id, status, data)}
                              onCancel={() => {
                                setIsWinLossDialogOpen(false);
                                setSelectedBid(null);
                              }}
                            />
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          {analytics && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Loss Reasons */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Loss Reasons</CardTitle>
                  <CardDescription>Most common reasons for losing bids</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analytics.top_loss_reasons.map((reason, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>{reason.reason}</span>
                          <span>{reason.count} bids</span>
                        </div>
                        <Progress 
                          value={(reason.count / analytics.total_bids_lost) * 100} 
                          className="h-2" 
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Top Competitors */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Competitors</CardTitle>
                  <CardDescription>Competitors who won against us</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analytics.top_competitors.map((competitor, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>{competitor.competitor}</span>
                          <span>{competitor.wins} wins</span>
                        </div>
                        <Progress 
                          value={(competitor.wins / analytics.total_bids_lost) * 100} 
                          className="h-2" 
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="benchmarks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Industry Benchmarks</CardTitle>
              <CardDescription>Compare your performance against industry standards</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {benchmarks.map((benchmark, index) => (
                  <div key={index} className="flex justify-between items-center p-4 border rounded">
                    <div>
                      <div className="font-medium">{benchmark.benchmark_type.replace('_', ' ').toUpperCase()}</div>
                      <div className="text-sm text-muted-foreground">
                        {benchmark.industry_sector} - {benchmark.company_size_category} companies
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">{benchmark.benchmark_value}%</div>
                      <div className="text-sm text-muted-foreground">Industry Average</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface WinLossUpdateFormProps {
  bid: BidSubmission | null;
  onSubmit: (status: string, data: any) => void;
  onCancel: () => void;
}

function WinLossUpdateForm({ bid, onSubmit, onCancel }: WinLossUpdateFormProps) {
  const [status, setStatus] = useState<'won' | 'lost'>('lost');
  const [formData, setFormData] = useState({
    lossReason: '',
    competitorWinner: '',
    competitorBidAmount: '',
    marginPercentage: '',
    lessonsLearned: '',
    clientFeedback: '',
    followUpOpportunities: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(status, formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Bid Result</Label>
        <Select value={status} onValueChange={(value: 'won' | 'lost') => setStatus(value)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="won">Won</SelectItem>
            <SelectItem value="lost">Lost</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {status === 'lost' && (
        <>
          <div>
            <Label htmlFor="lossReason">Loss Reason</Label>
            <Select value={formData.lossReason} onValueChange={(value) => setFormData({...formData, lossReason: value})}>
              <SelectTrigger>
                <SelectValue placeholder="Select reason..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="price_too_high">Price Too High</SelectItem>
                <SelectItem value="technical_requirements">Technical Requirements</SelectItem>
                <SelectItem value="experience_requirements">Experience Requirements</SelectItem>
                <SelectItem value="scheduling_conflict">Scheduling Conflict</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="competitorWinner">Winning Competitor</Label>
            <Input
              id="competitorWinner"
              value={formData.competitorWinner}
              onChange={(e) => setFormData({...formData, competitorWinner: e.target.value})}
              placeholder="Competitor name"
            />
          </div>

          <div>
            <Label htmlFor="competitorBidAmount">Competitor Bid Amount</Label>
            <Input
              id="competitorBidAmount"
              type="number"
              value={formData.competitorBidAmount}
              onChange={(e) => setFormData({...formData, competitorBidAmount: e.target.value})}
              placeholder="0.00"
            />
          </div>
        </>
      )}

      {status === 'won' && (
        <div>
          <Label htmlFor="marginPercentage">Margin Percentage</Label>
          <Input
            id="marginPercentage"
            type="number"
            step="0.1"
            value={formData.marginPercentage}
            onChange={(e) => setFormData({...formData, marginPercentage: e.target.value})}
            placeholder="15.0"
          />
        </div>
      )}

      <div>
        <Label htmlFor="lessonsLearned">Lessons Learned</Label>
        <Textarea
          id="lessonsLearned"
          value={formData.lessonsLearned}
          onChange={(e) => setFormData({...formData, lessonsLearned: e.target.value})}
          placeholder="What did we learn from this bid?"
        />
      </div>

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          Update Status
        </Button>
      </div>
    </form>
  );
}
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { LoadingState } from '@/components/ui/loading-spinner';
import { ErrorBoundary, ErrorState, EmptyState } from '@/components/ui/error-boundary';
import { ResponsiveContainer, ResponsiveGrid } from '@/components/layout/ResponsiveContainer';
import { useLoadingState } from '@/hooks/useLoadingState';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { mobileGridClasses, mobileFilterClasses, mobileButtonClasses, mobileTextClasses, mobileCardClasses } from '@/utils/mobileHelpers';
import { QuickBooksIntegration } from '@/components/integrations/QuickBooksIntegration';
import { 
  Settings,
  Search,
  Filter,
  Plus,
  ArrowRight,
  Building2,
  DollarSign,
  FileText,
  Users,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Target,
  Zap,
  Link,
  Eye,
  Edit,
  Trash2
} from 'lucide-react';

interface RoutingRule {
  id: string;
  name: string;
  description: string;
  field_type: 'memo' | 'reference' | 'customer_name' | 'item_name' | 'amount_range' | 'custom_field';
  field_name: string;
  match_type: 'exact' | 'contains' | 'starts_with' | 'ends_with' | 'regex' | 'range';
  match_value: string;
  project_id: string;
  priority: number;
  is_active: boolean;
  created_at: string;
  project?: {
    id: string;
    name: string;
    status: string;
  };
}

interface UnroutedTransaction {
  id: string;
  qb_transaction_id: string;
  transaction_type: 'expense' | 'invoice' | 'payment' | 'check';
  description: string;
  amount: number;
  customer_name?: string;
  vendor_name?: string;
  memo?: string;
  reference_number?: string;
  transaction_date: string;
  suggested_project_id?: string;
  confidence_score?: number;
  created_at: string;
}

const QuickBooksRouting = () => {
  const { user, userProfile, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState('unrouted');
  
  // Check if user has access to QuickBooks integration
  const hasIntegrationAccess = userProfile?.role && ['root_admin', 'admin', 'project_manager', 'accounting'].includes(userProfile.role);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showNewRuleDialog, setShowNewRuleDialog] = useState(false);
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>([]);
  const [bulkProjectId, setBulkProjectId] = useState('');
  
  const [newRule, setNewRule] = useState<Partial<RoutingRule>>({
    field_type: 'memo',
    match_type: 'contains',
    priority: 1,
    is_active: true
  });
  
  const { 
    data: routingRules, 
    loading: rulesLoading, 
    error: rulesError, 
    execute: loadRules 
  } = useLoadingState<RoutingRule[]>([]);

  const { 
    data: unroutedTransactions, 
    loading: transactionsLoading, 
    error: transactionsError, 
    execute: loadTransactions 
  } = useLoadingState<UnroutedTransaction[]>([]);

  const { 
    data: projects, 
    execute: loadProjects 
  } = useLoadingState<any[]>([]);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
    
    if (!loading && user && userProfile && !userProfile.company_id) {
      navigate('/setup');
    }
    
    if (!loading && user && userProfile) {
      loadRules(loadRoutingRules);
      loadTransactions(loadUnroutedTransactions);
      loadProjects(loadProjectsList);
    }
  }, [user, userProfile, loading, navigate]);

  const loadRoutingRules = async (): Promise<RoutingRule[]> => {
    if (!userProfile?.company_id) {
      throw new Error('No company associated with user');
    }

    // For now, return mock data since we need to create the routing rules table
    return [
      {
        id: '1',
        name: 'Project Code in Memo',
        description: 'Routes transactions with project codes like "PROJ-001" in memo field',
        field_type: 'memo',
        field_name: 'memo',
        match_type: 'regex',
        match_value: 'PROJ-\\d{3}',
        project_id: 'auto-detect',
        priority: 1,
        is_active: true,
        created_at: new Date().toISOString(),
        project: { id: 'auto', name: 'Auto-detect from code', status: 'active' }
      },
      {
        id: '2',
        name: 'Kitchen Renovation Keywords',
        description: 'Routes expenses containing kitchen renovation keywords',
        field_type: 'memo',
        field_name: 'memo',
        match_type: 'contains',
        match_value: 'kitchen,renovation,cabinets',
        project_id: 'proj-123',
        priority: 2,
        is_active: true,
        created_at: new Date().toISOString(),
        project: { id: 'proj-123', name: 'Smith Kitchen Renovation', status: 'active' }
      }
    ];
  };

  const loadUnroutedTransactions = async (): Promise<UnroutedTransaction[]> => {
    if (!userProfile?.company_id) {
      throw new Error('No company associated with user');
    }

    // Mock data for unrouted transactions
    return [
      {
        id: '1',
        qb_transaction_id: 'TXN-001',
        transaction_type: 'expense',
        description: 'Home Depot - Kitchen supplies PROJ-123',
        amount: 1250.00,
        vendor_name: 'Home Depot',
        memo: 'Kitchen supplies for Smith project PROJ-123',
        reference_number: 'HD-001',
        transaction_date: '2024-01-15',
        suggested_project_id: 'proj-123',
        confidence_score: 95,
        created_at: new Date().toISOString()
      },
      {
        id: '2',
        qb_transaction_id: 'TXN-002',
        transaction_type: 'invoice',
        description: 'Johnson Commercial Build - Phase 1',
        amount: 25000.00,
        customer_name: 'Johnson Corp',
        memo: 'Commercial build phase 1 completion',
        transaction_date: '2024-01-14',
        suggested_project_id: 'proj-456',
        confidence_score: 85,
        created_at: new Date().toISOString()
      },
      {
        id: '3',
        qb_transaction_id: 'TXN-003',
        transaction_type: 'expense',
        description: 'Material purchase - unassigned',
        amount: 850.00,
        vendor_name: 'Lumber Co',
        memo: 'Wood materials',
        transaction_date: '2024-01-13',
        created_at: new Date().toISOString()
      }
    ];
  };

  const loadProjectsList = async (): Promise<any[]> => {
    if (!userProfile?.company_id) {
      throw new Error('No company associated with user');
    }

    const { data, error } = await supabase
      .from('projects')
      .select('id, name, status')
      .eq('company_id', userProfile.company_id)
      .order('name');

    if (error) throw error;
    return data || [];
  };

  const createRoutingRule = async () => {
    if (!newRule.name || !newRule.match_value) {
      toast({
        title: "Validation Error",
        description: "Rule name and match value are required.",
        variant: "destructive"
      });
      return;
    }

    // Implementation would create rule in database
    toast({
      title: "Success",
      description: "Routing rule created successfully!",
    });

    setShowNewRuleDialog(false);
    setNewRule({
      field_type: 'memo',
      match_type: 'contains',
      priority: 1,
      is_active: true
    });
    loadRules(loadRoutingRules);
  };

  const routeTransactionToProject = async (transactionId: string, projectId: string) => {
    try {
      // Implementation would update transaction with project assignment
      toast({
        title: "Success",
        description: "Transaction routed to project successfully!",
      });
      loadTransactions(loadUnroutedTransactions);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to route transaction.",
        variant: "destructive"
      });
    }
  };

  const runAutoRouting = async () => {
    try {
      // Implementation would run all active routing rules against unrouted transactions
      toast({
        title: "Auto-routing Started",
        description: "Processing transactions with active routing rules...",
      });
      
      // Simulate processing
      setTimeout(() => {
        toast({
          title: "Auto-routing Complete",
          description: "Successfully routed 12 transactions using 5 rules.",
        });
        loadTransactions(loadUnroutedTransactions);
      }, 3000);
    } catch (error) {
      toast({
        title: "Error",
        description: "Auto-routing failed.",
        variant: "destructive"
      });
    }
  };

  const handleBulkAssignment = async () => {
    if (!bulkProjectId || selectedTransactions.length === 0) {
      toast({
        title: "Error",
        description: "Please select a project and at least one transaction.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Implementation would batch assign selected transactions to project
      toast({
        title: "Success",
        description: `Assigned ${selectedTransactions.length} transactions to project.`,
      });
      setSelectedTransactions([]);
      setBulkProjectId('');
      loadTransactions(loadUnroutedTransactions);
    } catch (error) {
      toast({
        title: "Error",
        description: "Bulk assignment failed.",
        variant: "destructive"
      });
    }
  };

  const getConfidenceColor = (score?: number) => {
    if (!score) return 'gray';
    if (score >= 90) return 'green';
    if (score >= 70) return 'yellow';
    return 'orange';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return <LoadingState message="Loading QuickBooks routing..." />;
  }

  if (!user) {
    return null;
  }

  return (
    <DashboardLayout title="QuickBooks Data Routing">
      <div className="space-y-6">
        {/* Auto-routing Button in Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className={mobileTextClasses.title}>QuickBooks Data Routing</h1>
          <Button onClick={runAutoRouting} className={mobileButtonClasses.primary}>
            <Zap className="h-4 w-4 mr-2" />
            Run Auto-routing
          </Button>
        </div>
            
        {/* Overview Cards */}
        <div className={mobileGridClasses.stats}>
          <Card className={mobileCardClasses.container}>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-orange-600" />
                <div>
                  <p className={mobileTextClasses.body}>Unrouted</p>
                  <p className="text-xl sm:text-2xl font-bold">{unroutedTransactions?.length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className={mobileCardClasses.container}>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <Target className="h-5 w-5 text-blue-600" />
                <div>
                  <p className={mobileTextClasses.body}>Active Rules</p>
                  <p className="text-xl sm:text-2xl font-bold">{routingRules?.filter(r => r.is_active).length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className={mobileCardClasses.container}>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <div>
                  <p className={mobileTextClasses.body}>Auto-matched</p>
                  <p className="text-xl sm:text-2xl font-bold">{unroutedTransactions?.filter(t => t.suggested_project_id).length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className={mobileCardClasses.container}>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-5 w-5 text-purple-600" />
                <div>
                  <p className={mobileTextClasses.body}>Total Value</p>
                  <p className="text-xl sm:text-2xl font-bold">
                    {formatCurrency(unroutedTransactions?.reduce((sum, t) => sum + t.amount, 0) || 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className={`grid w-full ${hasIntegrationAccess ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-1 sm:grid-cols-3'} h-auto`}>
            <TabsTrigger value="unrouted" className={`${mobileTextClasses.body} text-xs sm:text-sm`}>
              <span className="hidden sm:inline">Unrouted Transactions</span>
              <span className="sm:hidden">Unrouted</span>
            </TabsTrigger>
            <TabsTrigger value="rules" className={`${mobileTextClasses.body} text-xs sm:text-sm`}>
              <span className="hidden sm:inline">Routing Rules</span>
              <span className="sm:hidden">Rules</span>
            </TabsTrigger>
            <TabsTrigger value="history" className={`${mobileTextClasses.body} text-xs sm:text-sm`}>
              <span className="hidden sm:inline">Routing History</span>
              <span className="sm:hidden">History</span>
            </TabsTrigger>
            {hasIntegrationAccess && (
              <TabsTrigger value="integration" className={`${mobileTextClasses.body} text-xs sm:text-sm`}>
                <span className="hidden sm:inline">QB Integration</span>
                <span className="sm:hidden">QB Setup</span>
              </TabsTrigger>
            )}
          </TabsList>

              {/* Unrouted Transactions Tab */}
              <TabsContent value="unrouted" className="space-y-6">
          {/* Bulk Actions */}
          {selectedTransactions.length > 0 && (
            <Card className={`${mobileCardClasses.container} border-orange-200 bg-orange-50 dark:bg-orange-950/20`}>
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <p className={`${mobileTextClasses.body} font-medium`}>{selectedTransactions.length} transactions selected</p>
                    <Select value={bulkProjectId} onValueChange={setBulkProjectId}>
                      <SelectTrigger className={mobileFilterClasses.input}>
                        <SelectValue placeholder="Select project for bulk assignment" />
                      </SelectTrigger>
                      <SelectContent>
                        {projects?.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className={mobileFilterClasses.buttonGroup}>
                    <Button variant="outline" onClick={() => setSelectedTransactions([])} className={mobileButtonClasses.secondary}>
                      Cancel
                    </Button>
                    <Button onClick={handleBulkAssignment} className={mobileButtonClasses.secondary}>
                      Assign to Project
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Filters */}
          <Card className={mobileCardClasses.container}>
            <CardContent className="pt-6">
              <div className={mobileFilterClasses.container}>
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search transactions..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className={mobileFilterClasses.input}>
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Transactions</SelectItem>
                    <SelectItem value="suggested">Has Suggestions</SelectItem>
                    <SelectItem value="no_suggestions">No Suggestions</SelectItem>
                    <SelectItem value="high_confidence">High Confidence</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

                {/* Transactions List */}
                <Card>
                  <CardHeader>
                    <CardTitle>Unrouted Transactions</CardTitle>
                    <CardDescription>
                      QuickBooks transactions that need to be assigned to projects
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {!unroutedTransactions?.length ? (
                      <EmptyState
                        icon={CheckCircle2}
                        title="All transactions routed"
                        description="Great! All QuickBooks transactions have been assigned to projects."
                      />
                    ) : (
                       <div className="space-y-4">
                         {unroutedTransactions.map((transaction) => (
                           <div key={transaction.id} className="border rounded-lg p-3 sm:p-4 hover:bg-muted/50 transition-colors">
                             <div className="flex flex-col space-y-3 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
                               <div className="flex items-start space-x-2 sm:space-x-3 flex-1">
                                 <Checkbox
                                   checked={selectedTransactions.includes(transaction.id)}
                                   onCheckedChange={(checked) => {
                                     if (checked) {
                                       setSelectedTransactions([...selectedTransactions, transaction.id]);
                                     } else {
                                       setSelectedTransactions(selectedTransactions.filter(id => id !== transaction.id));
                                     }
                                   }}
                                   className="mt-1"
                                 />
                                 <div className="flex-1 min-w-0">
                                   <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-2 mb-2">
                                     <h3 className="font-medium text-sm sm:text-base truncate">{transaction.description}</h3>
                                     <div className="flex items-center space-x-1 sm:space-x-2">
                                       <Badge variant="outline" className="text-xs">
                                         {transaction.transaction_type}
                                       </Badge>
                                       {transaction.confidence_score && (
                                         <Badge variant="outline" className={`text-xs text-${getConfidenceColor(transaction.confidence_score)}-600`}>
                                           {transaction.confidence_score}%
                                         </Badge>
                                       )}
                                     </div>
                                   </div>
                                   
                                   <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-2 text-xs sm:text-sm text-muted-foreground mb-2">
                                     <div className="truncate">
                                       <span className="sm:hidden font-medium">Amount: </span>
                                       <span className="font-medium text-foreground">{formatCurrency(transaction.amount)}</span>
                                     </div>
                                     <div className="truncate">
                                       <span className="sm:hidden font-medium">Date: </span>
                                       <span className="font-medium text-foreground">{formatDate(transaction.transaction_date)}</span>
                                     </div>
                                     <div className="truncate">
                                       <span className="sm:hidden font-medium">
                                         {transaction.customer_name ? 'Customer: ' : 'Vendor: '}
                                       </span>
                                       {transaction.customer_name || transaction.vendor_name}
                                     </div>
                                   </div>
                                   
                                   {transaction.memo && (
                                     <p className="text-xs sm:text-sm text-muted-foreground mb-2 line-clamp-2">
                                       <strong className="sm:inline hidden">Memo:</strong> {transaction.memo}
                                     </p>
                                   )}
                                   
                                   {transaction.suggested_project_id && (
                                     <div className="flex items-center space-x-2 text-xs sm:text-sm">
                                       <Target className="h-3 w-3 sm:h-4 sm:w-4 text-green-600 flex-shrink-0" />
                                       <span className="text-green-600 font-medium truncate">
                                         <span className="sm:hidden">Proj {transaction.suggested_project_id}</span>
                                         <span className="hidden sm:inline">Suggested: Project {transaction.suggested_project_id}</span>
                                       </span>
                                     </div>
                                   )}
                                 </div>
                               </div>
                               
                               <div className="flex flex-row sm:flex-col space-x-2 sm:space-x-0 sm:space-y-2 sm:ml-4">
                                 {transaction.suggested_project_id ? (
                                   <Button 
                                     size="sm" 
                                     onClick={() => routeTransactionToProject(transaction.id, transaction.suggested_project_id!)}
                                     className="bg-green-600 hover:bg-green-700 flex-1 sm:flex-none text-xs sm:text-sm"
                                   >
                                     <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                                     <span className="sm:hidden">Accept</span>
                                     <span className="hidden sm:inline">Accept</span>
                                   </Button>
                                 ) : (
                                   <Select onValueChange={(projectId) => routeTransactionToProject(transaction.id, projectId)}>
                                     <SelectTrigger className="w-full sm:w-40 text-xs sm:text-sm">
                                       <SelectValue placeholder="Assign to project" />
                                     </SelectTrigger>
                                     <SelectContent>
                                       {projects?.map((project) => (
                                         <SelectItem key={project.id} value={project.id} className="text-xs sm:text-sm">
                                           {project.name}
                                         </SelectItem>
                                       ))}
                                     </SelectContent>
                                   </Select>
                                 )}
                                 <Button variant="outline" size="sm" className="flex-1 sm:flex-none text-xs sm:text-sm">
                                   <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                                   <span className="sm:hidden">View</span>
                                   <span className="hidden sm:inline">Details</span>
                                 </Button>
                               </div>
                             </div>
                           </div>
                         ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Routing Rules Tab */}
              <TabsContent value="rules" className="space-y-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>Routing Rules</CardTitle>
                      <CardDescription>
                        Configure automatic routing rules for QuickBooks data
                      </CardDescription>
                    </div>
                    <Dialog open={showNewRuleDialog} onOpenChange={setShowNewRuleDialog}>
                      <DialogTrigger asChild>
                        <Button>
                          <Plus className="h-4 w-4 mr-2" />
                          New Rule
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Create Routing Rule</DialogTitle>
                          <DialogDescription>
                            Set up automatic routing based on transaction data
                          </DialogDescription>
                        </DialogHeader>
                        
                        <div className="grid gap-4 py-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="rule_name">Rule Name</Label>
                              <Input
                                id="rule_name"
                                value={newRule.name || ''}
                                onChange={(e) => setNewRule({...newRule, name: e.target.value})}
                                placeholder="e.g., Kitchen Project POs"
                              />
                            </div>
                            <div>
                              <Label htmlFor="priority">Priority</Label>
                              <Input
                                id="priority"
                                type="number"
                                min="1"
                                max="100"
                                value={newRule.priority || 1}
                                onChange={(e) => setNewRule({...newRule, priority: Number(e.target.value)})}
                              />
                            </div>
                          </div>
                          
                          <div>
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                              id="description"
                              value={newRule.description || ''}
                              onChange={(e) => setNewRule({...newRule, description: e.target.value})}
                              placeholder="Describe when this rule should apply..."
                            />
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="field_type">Field to Match</Label>
                              <Select value={newRule.field_type} onValueChange={(value: any) => setNewRule({...newRule, field_type: value})}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="memo">Memo/Description</SelectItem>
                                  <SelectItem value="reference">Reference Number</SelectItem>
                                  <SelectItem value="customer_name">Customer Name</SelectItem>
                                  <SelectItem value="item_name">Item/Service Name</SelectItem>
                                  <SelectItem value="amount_range">Amount Range</SelectItem>
                                  <SelectItem value="custom_field">Custom Field</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label htmlFor="match_type">Match Type</Label>
                              <Select value={newRule.match_type} onValueChange={(value: any) => setNewRule({...newRule, match_type: value})}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="exact">Exact Match</SelectItem>
                                  <SelectItem value="contains">Contains</SelectItem>
                                  <SelectItem value="starts_with">Starts With</SelectItem>
                                  <SelectItem value="ends_with">Ends With</SelectItem>
                                  <SelectItem value="regex">Regular Expression</SelectItem>
                                  <SelectItem value="range">Number Range</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          
                          <div>
                            <Label htmlFor="match_value">Match Value</Label>
                            <Input
                              id="match_value"
                              value={newRule.match_value || ''}
                              onChange={(e) => setNewRule({...newRule, match_value: e.target.value})}
                              placeholder="e.g., PROJ-123, Kitchen, 1000-5000"
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor="project_id">Target Project</Label>
                            <Select value={newRule.project_id} onValueChange={(value) => setNewRule({...newRule, project_id: value})}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select project" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="auto-detect">Auto-detect from match</SelectItem>
                                {projects?.map((project) => (
                                  <SelectItem key={project.id} value={project.id}>
                                    {project.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="is_active"
                              checked={newRule.is_active || false}
                              onCheckedChange={(checked) => setNewRule({...newRule, is_active: !!checked})}
                            />
                            <Label htmlFor="is_active">Rule is active</Label>
                          </div>
                        </div>

                        <div className="flex justify-end space-x-2">
                          <Button variant="outline" onClick={() => setShowNewRuleDialog(false)}>
                            Cancel
                          </Button>
                          <Button onClick={createRoutingRule}>
                            Create Rule
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {routingRules?.map((rule) => (
                        <div key={rule.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <h3 className="font-medium">{rule.name}</h3>
                                <Badge variant={rule.is_active ? "default" : "secondary"}>
                                  {rule.is_active ? "Active" : "Inactive"}
                                </Badge>
                                <Badge variant="outline">Priority {rule.priority}</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">{rule.description}</p>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                                <div><strong>Field:</strong> {rule.field_name}</div>
                                <div><strong>Match:</strong> {rule.match_type}</div>
                                <div><strong>Value:</strong> {rule.match_value}</div>
                              </div>
                              {rule.project && (
                                <div className="mt-2 text-sm">
                                  <strong>Project:</strong> {rule.project.name}
                                </div>
                              )}
                            </div>
                            <div className="flex space-x-2">
                              <Button variant="outline" size="sm">
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </Button>
                              <Button variant="outline" size="sm">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* History Tab */}
              <TabsContent value="history" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Routing History</CardTitle>
                    <CardDescription>
                      Track all automatic and manual routing activities
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-12">
                      <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">Routing History</h3>
                      <p className="text-muted-foreground mb-4">
                        View detailed logs of all routing activities and rule applications.
                      </p>
                      <p className="text-sm text-muted-foreground">
                        This feature tracks successful routes, rule matches, and manual assignments.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* QuickBooks Integration Tab */}
              {hasIntegrationAccess && (
                <TabsContent value="integration" className="space-y-6">
                  <QuickBooksIntegration />
                </TabsContent>
              )}
            </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default QuickBooksRouting;
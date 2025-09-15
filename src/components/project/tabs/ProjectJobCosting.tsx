import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { 
  DollarSign, 
  PlusCircle,
  TrendingUp,
  TrendingDown,
  Calculator,
  Clock,
  Package,
  Truck,
  Users,
  AlertTriangle,
  Target,
  BarChart3,
  Calendar,
  Edit,
  Trash2
} from 'lucide-react';

interface CostCode {
  id: string;
  project_id: string;
  code: string;
  description: string;
  category: 'labor' | 'materials' | 'equipment' | 'overhead' | 'subcontractor';
  budget_amount: number;
  created_at: string;
}

interface CostEntry {
  id: string;
  cost_code_id: string;
  entry_type: 'labor' | 'material' | 'equipment' | 'overhead' | 'subcontractor';
  amount: number;
  quantity?: number;
  unit_cost?: number;
  description?: string;
  entry_date: string;
  created_at: string;
  cost_code?: CostCode;
}

interface JobCost {
  id: string;
  project_id: string;
  date: string;
  description?: string;
  labor_hours: number;
  labor_cost: number;
  material_cost: number;
  equipment_cost: number;
  other_cost: number;
  total_cost: number;
  created_at: string;
  cost_code?: {
    code: string;
    name: string;
    category: string;
  };
}

interface Expense {
  id: string;
  project_id: string;
  amount: number;
  description: string;
  expense_date: string;
  vendor_name?: string;
  category?: string;
  created_at: string;
}

interface ProjectJobCostingProps {
  projectId: string;
  projectBudget?: number;
  onNavigate: (path: string) => void;
}

export const ProjectJobCosting: React.FC<ProjectJobCostingProps> = ({
  projectId,
  projectBudget = 0,
  onNavigate
}) => {
  const { userProfile } = useAuth();
  const [costCodes, setCostCodes] = useState<CostCode[]>([]);
  const [costEntries, setCostEntries] = useState<CostEntry[]>([]);
  const [jobCosts, setJobCosts] = useState<JobCost[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showAddCostCode, setShowAddCostCode] = useState(false);
  const [showAddEntry, setShowAddEntry] = useState(false);

  const [newCostCode, setNewCostCode] = useState({
    code: '',
    description: '',
    category: 'labor' as const,
    budget_amount: ''
  });

  const [newEntry, setNewEntry] = useState({
    cost_code_id: '',
    entry_type: 'labor' as const,
    amount: '',
    quantity: '',
    unit_cost: '',
    description: '',
    entry_date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    if (projectId && userProfile?.company_id) {
      loadAllData();
    }
  }, [projectId, userProfile?.company_id]);

  const loadAllData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadCostCodes(),
        loadCostEntries(),
        loadJobCosts(),
        loadExpenses()
      ]);
    } catch (error) {
      console.error('Error loading job costing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCostCodes = async () => {
    try {
      const { data, error } = await supabase
        .from('project_cost_codes')
        .select('*')
        .eq('project_id', projectId)
        .order('code');

      if (error) throw error;
      setCostCodes(data || []);
    } catch (error: any) {
      console.error('Error loading cost codes:', error);
    }
  };

  const loadCostEntries = async () => {
    try {
      const { data, error } = await supabase
        .from('project_cost_entries')
        .select(`
          *,
          cost_code:project_cost_codes(*)
        `)
        .eq('company_id', userProfile?.company_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Filter entries for this project's cost codes
      const projectEntries = data?.filter(entry => 
        costCodes.some(code => code.id === entry.cost_code_id)
      ) || [];
      
      setCostEntries(projectEntries);
    } catch (error: any) {
      console.error('Error loading cost entries:', error);
    }
  };

  const loadJobCosts = async () => {
    try {
      const { data, error } = await supabase
        .from('job_costs')
        .select(`
          *,
          cost_code:cost_codes(code, name, category)
        `)
        .eq('project_id', projectId)
        .order('date', { ascending: false });

      if (error) throw error;
      setJobCosts(data || []);
    } catch (error: any) {
      console.error('Error loading job costs:', error);
    }
  };

  const loadExpenses = async () => {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('project_id', projectId)
        .order('expense_date', { ascending: false });

      if (error) throw error;
      setExpenses(data || []);
    } catch (error: any) {
      console.error('Error loading expenses:', error);
    }
  };

  const handleCreateCostCode = async () => {
    try {
      const costCodeData = {
        project_id: projectId,
        company_id: userProfile?.company_id,
        code: newCostCode.code,
        description: newCostCode.description,
        category: newCostCode.category,
        budget_amount: parseFloat(newCostCode.budget_amount) || 0
      };

      const { data, error } = await supabase
        .from('project_cost_codes')
        .insert([costCodeData])
        .select()
        .single();

      if (error) throw error;

      setCostCodes([...costCodes, data]);
      setNewCostCode({
        code: '',
        description: '',
        category: 'labor',
        budget_amount: ''
      });
      setShowAddCostCode(false);

      toast({
        title: "Success",
        description: "Cost code created successfully"
      });
    } catch (error: any) {
      console.error('Error creating cost code:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to create cost code"
      });
    }
  };

  const handleCreateEntry = async () => {
    try {
      const entryData = {
        cost_code_id: newEntry.cost_code_id,
        company_id: userProfile?.company_id,
        entry_type: newEntry.entry_type,
        amount: parseFloat(newEntry.amount),
        quantity: newEntry.quantity ? parseFloat(newEntry.quantity) : null,
        unit_cost: newEntry.unit_cost ? parseFloat(newEntry.unit_cost) : null,
        description: newEntry.description || null,
        entry_date: newEntry.entry_date,
        created_by: userProfile?.id
      };

      const { data, error } = await supabase
        .from('project_cost_entries')
        .insert([entryData])
        .select(`
          *,
          cost_code:project_cost_codes(*)
        `)
        .single();

      if (error) throw error;

      setCostEntries([data, ...costEntries]);
      setNewEntry({
        cost_code_id: '',
        entry_type: 'labor',
        amount: '',
        quantity: '',
        unit_cost: '',
        description: '',
        entry_date: new Date().toISOString().split('T')[0]
      });
      setShowAddEntry(false);

      toast({
        title: "Success",
        description: "Cost entry recorded successfully"
      });
    } catch (error: any) {
      console.error('Error creating entry:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to record cost entry"
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getCostSummary = () => {
    const totalActual = costEntries.reduce((sum, entry) => sum + entry.amount, 0) +
                      jobCosts.reduce((sum, cost) => sum + cost.total_cost, 0) +
                      expenses.reduce((sum, expense) => sum + expense.amount, 0);
    
    const totalBudget = costCodes.reduce((sum, code) => sum + code.budget_amount, 0) || projectBudget;
    const variance = totalBudget - totalActual;
    const percentSpent = totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0;

    const categoryBreakdown = {
      labor: costEntries.filter(e => e.entry_type === 'labor').reduce((sum, e) => sum + e.amount, 0) +
             jobCosts.reduce((sum, cost) => sum + cost.labor_cost, 0),
      materials: costEntries.filter(e => e.entry_type === 'material').reduce((sum, e) => sum + e.amount, 0) +
                jobCosts.reduce((sum, cost) => sum + cost.material_cost, 0),
      equipment: costEntries.filter(e => e.entry_type === 'equipment').reduce((sum, e) => sum + e.amount, 0) +
                jobCosts.reduce((sum, cost) => sum + cost.equipment_cost, 0),
      overhead: costEntries.filter(e => e.entry_type === 'overhead').reduce((sum, e) => sum + e.amount, 0) +
               jobCosts.reduce((sum, cost) => sum + cost.other_cost, 0),
      subcontractor: costEntries.filter(e => e.entry_type === 'subcontractor').reduce((sum, e) => sum + e.amount, 0)
    };

    return {
      totalActual,
      totalBudget,
      variance,
      percentSpent,
      categoryBreakdown
    };
  };

  const summary = getCostSummary();

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'labor': return Users;
      case 'materials': case 'material': return Package;
      case 'equipment': return Truck;
      case 'overhead': return BarChart3;
      case 'subcontractor': return Users;
      default: return Calculator;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'labor': return 'text-blue-600';
      case 'materials': case 'material': return 'text-green-600';
      case 'equipment': return 'text-yellow-600';
      case 'overhead': return 'text-purple-600';
      case 'subcontractor': return 'text-orange-600';
      default: return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="cost-codes">Cost Codes</TabsTrigger>
          <TabsTrigger value="entries">Cost Entries</TabsTrigger>
          <TabsTrigger value="analysis">Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Budget</p>
                    <p className="text-xl font-bold">{formatCurrency(summary.totalBudget)}</p>
                  </div>
                  <Target className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Actual Costs</p>
                    <p className="text-xl font-bold">{formatCurrency(summary.totalActual)}</p>
                  </div>
                  <Calculator className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Variance</p>
                    <p className={`text-xl font-bold ${summary.variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(summary.variance)}
                    </p>
                  </div>
                  {summary.variance >= 0 ? (
                    <TrendingUp className="h-8 w-8 text-green-600" />
                  ) : (
                    <TrendingDown className="h-8 w-8 text-red-600" />
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">% Spent</p>
                    <p className="text-xl font-bold">{summary.percentSpent.toFixed(1)}%</p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-primary" />
                </div>
                <Progress value={Math.min(summary.percentSpent, 100)} className="mt-2" />
              </CardContent>
            </Card>
          </div>

          {/* Category Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Cost Breakdown by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {Object.entries(summary.categoryBreakdown).map(([category, amount]) => {
                  const Icon = getCategoryIcon(category);
                  const colorClass = getCategoryColor(category);
                  
                  return (
                    <div key={category} className="text-center p-4 border rounded-lg">
                      <Icon className={`h-8 w-8 mx-auto mb-2 ${colorClass}`} />
                      <p className="text-sm font-medium text-muted-foreground capitalize">
                        {category}
                      </p>
                      <p className={`text-lg font-bold ${colorClass}`}>
                        {formatCurrency(amount)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cost-codes" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Cost Codes ({costCodes.length})</span>
                <Dialog open={showAddCostCode} onOpenChange={setShowAddCostCode}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Add Cost Code
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Cost Code</DialogTitle>
                      <DialogDescription>
                        Create a new cost code for tracking project expenses
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="code">Code</Label>
                          <Input
                            id="code"
                            value={newCostCode.code}
                            onChange={(e) => setNewCostCode({...newCostCode, code: e.target.value})}
                            placeholder="e.g., LAB-001"
                          />
                        </div>
                        <div>
                          <Label htmlFor="category">Category</Label>
                          <Select value={newCostCode.category} onValueChange={(value: any) => setNewCostCode({...newCostCode, category: value})}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="labor">Labor</SelectItem>
                              <SelectItem value="materials">Materials</SelectItem>
                              <SelectItem value="equipment">Equipment</SelectItem>
                              <SelectItem value="overhead">Overhead</SelectItem>
                              <SelectItem value="subcontractor">Subcontractor</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          value={newCostCode.description}
                          onChange={(e) => setNewCostCode({...newCostCode, description: e.target.value})}
                          placeholder="Cost code description..."
                        />
                      </div>
                      <div>
                        <Label htmlFor="budget_amount">Budget Amount</Label>
                        <Input
                          id="budget_amount"
                          type="number"
                          step="0.01"
                          value={newCostCode.budget_amount}
                          onChange={(e) => setNewCostCode({...newCostCode, budget_amount: e.target.value})}
                          placeholder="0.00"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setShowAddCostCode(false)}>
                          Cancel
                        </Button>
                        <Button 
                          onClick={handleCreateCostCode}
                          disabled={!newCostCode.code || !newCostCode.description}
                        >
                          Create Cost Code
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {costCodes.length > 0 ? (
                <div className="space-y-2">
                  {costCodes.map((costCode) => {
                    const Icon = getCategoryIcon(costCode.category);
                    const actualSpent = costEntries
                      .filter(entry => entry.cost_code_id === costCode.id)
                      .reduce((sum, entry) => sum + entry.amount, 0);
                    const percentUsed = costCode.budget_amount > 0 ? (actualSpent / costCode.budget_amount) * 100 : 0;
                    
                    return (
                      <div key={costCode.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <Icon className={`h-5 w-5 ${getCategoryColor(costCode.category)}`} />
                            <span className="font-medium">{costCode.code}</span>
                            <Badge variant="outline" className="capitalize">
                              {costCode.category}
                            </Badge>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">{formatCurrency(actualSpent)} / {formatCurrency(costCode.budget_amount)}</p>
                            <p className="text-sm text-muted-foreground">{percentUsed.toFixed(1)}% used</p>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{costCode.description}</p>
                        <Progress value={Math.min(percentUsed, 100)} className="h-2" />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calculator className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">No cost codes defined yet</p>
                  <Button onClick={() => setShowAddCostCode(true)} variant="outline">
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Create First Cost Code
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="entries" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Cost Entries ({costEntries.length})</span>
                <Dialog open={showAddEntry} onOpenChange={setShowAddEntry}>
                  <DialogTrigger asChild>
                    <Button size="sm" disabled={costCodes.length === 0}>
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Add Entry
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Record Cost Entry</DialogTitle>
                      <DialogDescription>
                        Record an actual cost against a cost code
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="cost_code">Cost Code</Label>
                        <Select value={newEntry.cost_code_id} onValueChange={(value) => setNewEntry({...newEntry, cost_code_id: value})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select cost code" />
                          </SelectTrigger>
                          <SelectContent>
                            {costCodes.map((code) => (
                              <SelectItem key={code.id} value={code.id}>
                                {code.code} - {code.description}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="entry_type">Type</Label>
                          <Select value={newEntry.entry_type} onValueChange={(value: any) => setNewEntry({...newEntry, entry_type: value})}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="labor">Labor</SelectItem>
                              <SelectItem value="material">Material</SelectItem>
                              <SelectItem value="equipment">Equipment</SelectItem>
                              <SelectItem value="overhead">Overhead</SelectItem>
                              <SelectItem value="subcontractor">Subcontractor</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="amount">Amount</Label>
                          <Input
                            id="amount"
                            type="number"
                            step="0.01"
                            value={newEntry.amount}
                            onChange={(e) => setNewEntry({...newEntry, amount: e.target.value})}
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="quantity">Quantity (Optional)</Label>
                          <Input
                            id="quantity"
                            type="number"
                            step="0.01"
                            value={newEntry.quantity}
                            onChange={(e) => setNewEntry({...newEntry, quantity: e.target.value})}
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <Label htmlFor="unit_cost">Unit Cost (Optional)</Label>
                          <Input
                            id="unit_cost"
                            type="number"
                            step="0.01"
                            value={newEntry.unit_cost}
                            onChange={(e) => setNewEntry({...newEntry, unit_cost: e.target.value})}
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="entry_date">Date</Label>
                        <Input
                          id="entry_date"
                          type="date"
                          value={newEntry.entry_date}
                          onChange={(e) => setNewEntry({...newEntry, entry_date: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          value={newEntry.description}
                          onChange={(e) => setNewEntry({...newEntry, description: e.target.value})}
                          placeholder="Cost entry description..."
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setShowAddEntry(false)}>
                          Cancel
                        </Button>
                        <Button 
                          onClick={handleCreateEntry}
                          disabled={!newEntry.cost_code_id || !newEntry.amount}
                        >
                          Record Entry
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {costEntries.length > 0 ? (
                <div className="space-y-4">
                  {costEntries.map((entry) => {
                    const Icon = getCategoryIcon(entry.entry_type);
                    
                    return (
                      <div key={entry.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Icon className={`h-5 w-5 ${getCategoryColor(entry.entry_type)}`} />
                            <div>
                              <p className="font-medium">{entry.cost_code?.code}</p>
                              <p className="text-sm text-muted-foreground">{entry.cost_code?.description}</p>
                            </div>
                            <Badge variant="outline" className="capitalize">
                              {entry.entry_type}
                            </Badge>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center">
                              <DollarSign className="h-4 w-4 text-green-600" />
                              <span className="font-medium text-green-600">
                                {formatCurrency(entry.amount)}
                              </span>
                            </div>
                            {entry.quantity && entry.unit_cost && (
                              <p className="text-xs text-muted-foreground">
                                {entry.quantity} × {formatCurrency(entry.unit_cost)}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        {entry.description && (
                          <p className="text-sm mt-2">{entry.description}</p>
                        )}
                        
                        <div className="flex items-center space-x-4 mt-2 text-sm text-muted-foreground">
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-4 w-4" />
                            <span>{new Date(entry.entry_date).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calculator className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">No cost entries recorded yet</p>
                  {costCodes.length > 0 ? (
                    <Button onClick={() => setShowAddEntry(true)} variant="outline">
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Record First Entry
                    </Button>
                  ) : (
                    <p className="text-sm text-muted-foreground">Create cost codes first to record entries</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Cost Analysis</CardTitle>
              <CardDescription>
                Detailed analysis of project costs and budget performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Budget Performance */}
                <div>
                  <h4 className="font-medium mb-4">Budget Performance</h4>
                  <div className="space-y-4">
                    {summary.variance < 0 && (
                      <div className="flex items-center space-x-2 text-red-600">
                        <AlertTriangle className="h-5 w-5" />
                        <span className="font-medium">
                          Project is over budget by {formatCurrency(Math.abs(summary.variance))}
                        </span>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground">Budget Utilization</p>
                        <p className="text-2xl font-bold">{summary.percentSpent.toFixed(1)}%</p>
                        <Progress value={Math.min(summary.percentSpent, 100)} className="mt-2" />
                      </div>
                      
                      <div className="text-center p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground">Remaining Budget</p>
                        <p className={`text-2xl font-bold ${summary.variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(Math.max(summary.variance, 0))}
                        </p>
                      </div>
                      
                      <div className="text-center p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground">Total Entries</p>
                        <p className="text-2xl font-bold">{costEntries.length + jobCosts.length + expenses.length}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cost Trends */}
                <div>
                  <h4 className="font-medium mb-4">Recent Activity</h4>
                  <div className="space-y-2">
                    {[...costEntries, ...expenses]
                      .sort((a, b) => new Date(b.created_at || b.expense_date).getTime() - new Date(a.created_at || a.expense_date).getTime())
                      .slice(0, 5)
                      .map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded">
                          <div>
                            <p className="font-medium">
                              {'entry_type' in item ? item.entry_type : 'Expense'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {'entry_date' in item 
                                ? new Date(item.entry_date).toLocaleDateString()
                                : new Date(item.expense_date).toLocaleDateString()
                              }
                            </p>
                          </div>
                          <span className="font-medium">
                            {formatCurrency(item.amount)}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

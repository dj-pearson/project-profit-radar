import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Plus,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Clock,
  Users,
  Wrench,
  Package,
  BarChart3,
  Edit,
  Save,
  X
} from 'lucide-react';

interface JobCost {
  id: string;
  project_id: string;
  cost_code_id: string;
  date: string;
  labor_hours: number;
  labor_cost: number;
  material_cost: number;
  equipment_cost: number;
  other_cost: number;
  total_cost: number;
  description: string;
  created_at: string;
  cost_codes: {
    code: string;
    name: string;
    category: string;
  };
}

interface Project {
  id: string;
  name: string;
  budget: number;
  status: string;
}

interface CostCode {
  id: string;
  code: string;
  name: string;
  category: string;
}

interface CostSummary {
  totalCost: number;
  laborCost: number;
  materialCost: number;
  equipmentCost: number;
  otherCost: number;
  budgetVariance: number;
  budgetVariancePercentage: number;
}

interface RealTimeJobCostingProps {
  projectId?: string;
}

const RealTimeJobCosting: React.FC<RealTimeJobCostingProps> = ({ projectId }) => {
  const { user, userProfile } = useAuth();
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>(projectId || '');
  const [costCodes, setCostCodes] = useState<CostCode[]>([]);
  const [jobCosts, setJobCosts] = useState<JobCost[]>([]);
  const [costSummary, setCostSummary] = useState<CostSummary>({
    totalCost: 0,
    laborCost: 0,
    materialCost: 0,
    equipmentCost: 0,
    otherCost: 0,
    budgetVariance: 0,
    budgetVariancePercentage: 0
  });
  
  const [loading, setLoading] = useState(true);
  const [addingCost, setAddingCost] = useState(false);
  const [editingCost, setEditingCost] = useState<string | null>(null);
  
  // Add cost form state
  const [newCostForm, setNewCostForm] = useState({
    cost_code_id: '',
    date: new Date().toISOString().split('T')[0],
    labor_hours: '',
    labor_cost: '',
    material_cost: '',
    equipment_cost: '',
    other_cost: '',
    description: ''
  });

  // Load initial data
  useEffect(() => {
    if (userProfile?.company_id) {
      loadData();
    }
  }, [userProfile?.company_id]);

  // Set up real-time subscription
  useEffect(() => {
    if (!selectedProject) return;

    const channel = supabase
      .channel('job-costs-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'job_costs',
          filter: `project_id=eq.${selectedProject}`
        },
        (payload) => {
          console.log('Real-time job costs update:', payload);
          handleRealTimeUpdate(payload);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedProject]);

  // Recalculate summary when costs change
  useEffect(() => {
    calculateCostSummary();
  }, [jobCosts, selectedProject]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load projects
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('id, name, budget, status')
        .eq('company_id', userProfile?.company_id)
        .order('created_at', { ascending: false });

      if (projectsError) throw projectsError;
      setProjects(projectsData || []);

      // Set initial project if not set
      if (!selectedProject && projectsData && projectsData.length > 0) {
        setSelectedProject(projectsData[0].id);
      }

      // Load cost codes
      const { data: costCodesData, error: costCodesError } = await supabase
        .from('cost_codes')
        .select('id, code, name, category')
        .eq('company_id', userProfile?.company_id)
        .eq('is_active', true)
        .order('code');

      if (costCodesError) throw costCodesError;
      setCostCodes(costCodesData || []);

    } catch (error: any) {
      console.error('Error loading data:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load project data"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadJobCosts = async (projectId: string) => {
    try {
      const { data: costsData, error: costsError } = await supabase
        .from('job_costs')
        .select(`
          *,
          cost_codes(code, name, category)
        `)
        .eq('project_id', projectId)
        .order('date', { ascending: false });

      if (costsError) throw costsError;
      setJobCosts(costsData || []);

    } catch (error: any) {
      console.error('Error loading job costs:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load job costs"
      });
    }
  };

  const handleRealTimeUpdate = useCallback((payload: any) => {
    const { eventType, new: newRecord, old: oldRecord } = payload;
    
    switch (eventType) {
      case 'INSERT':
        // Fetch the complete record with cost code details
        supabase
          .from('job_costs')
          .select(`
            *,
            cost_codes(code, name, category)
          `)
          .eq('id', newRecord.id)
          .single()
          .then(({ data, error }) => {
            if (!error && data) {
              setJobCosts(prev => [data, ...prev]);
              toast({
                title: "New Cost Added",
                description: `${data.cost_codes?.name}: $${data.total_cost?.toLocaleString()}`
              });
            }
          });
        break;
        
      case 'UPDATE':
        setJobCosts(prev => 
          prev.map(cost => 
            cost.id === newRecord.id 
              ? { ...cost, ...newRecord }
              : cost
          )
        );
        toast({
          title: "Cost Updated",
          description: "Job cost has been updated"
        });
        break;
        
      case 'DELETE':
        setJobCosts(prev => prev.filter(cost => cost.id !== oldRecord.id));
        toast({
          title: "Cost Deleted",
          description: "Job cost has been removed"
        });
        break;
    }
  }, []);

  const calculateCostSummary = () => {
    const currentProject = projects.find(p => p.id === selectedProject);
    if (!currentProject) return;

    const totalCost = jobCosts.reduce((sum, cost) => sum + (cost.total_cost || 0), 0);
    const laborCost = jobCosts.reduce((sum, cost) => sum + (cost.labor_cost || 0), 0);
    const materialCost = jobCosts.reduce((sum, cost) => sum + (cost.material_cost || 0), 0);
    const equipmentCost = jobCosts.reduce((sum, cost) => sum + (cost.equipment_cost || 0), 0);
    const otherCost = jobCosts.reduce((sum, cost) => sum + (cost.other_cost || 0), 0);
    
    const budget = currentProject.budget || 0;
    const budgetVariance = budget - totalCost;
    const budgetVariancePercentage = budget > 0 ? (budgetVariance / budget) * 100 : 0;

    setCostSummary({
      totalCost,
      laborCost,
      materialCost,
      equipmentCost,
      otherCost,
      budgetVariance,
      budgetVariancePercentage
    });
  };

  const handleProjectChange = (projectId: string) => {
    setSelectedProject(projectId);
    if (projectId) {
      loadJobCosts(projectId);
    }
  };

  const addJobCost = async () => {
    if (!selectedProject || !newCostForm.cost_code_id) return;

    try {
      setAddingCost(true);
      
      const laborCost = parseFloat(newCostForm.labor_cost) || 0;
      const materialCost = parseFloat(newCostForm.material_cost) || 0;
      const equipmentCost = parseFloat(newCostForm.equipment_cost) || 0;
      const otherCost = parseFloat(newCostForm.other_cost) || 0;
      const totalCost = laborCost + materialCost + equipmentCost + otherCost;

      const costData = {
        project_id: selectedProject,
        cost_code_id: newCostForm.cost_code_id,
        date: newCostForm.date,
        labor_hours: parseFloat(newCostForm.labor_hours) || 0,
        labor_cost: laborCost,
        material_cost: materialCost,
        equipment_cost: equipmentCost,
        other_cost: otherCost,
        description: newCostForm.description || null,
        created_by: user?.id
      };

      const { error } = await supabase
        .from('job_costs')
        .insert([costData]);

      if (error) throw error;

      // Reset form
      setNewCostForm({
        cost_code_id: '',
        date: new Date().toISOString().split('T')[0],
        labor_hours: '',
        labor_cost: '',
        material_cost: '',
        equipment_cost: '',
        other_cost: '',
        description: ''
      });

      toast({
        title: "Cost Added",
        description: `Job cost of $${totalCost.toLocaleString()} has been added`
      });

    } catch (error: any) {
      console.error('Error adding job cost:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add job cost"
      });
    } finally {
      setAddingCost(false);
    }
  };

  const updateFormField = (field: string, value: string) => {
    setNewCostForm(prev => ({ ...prev, [field]: value }));
  };

  const getVarianceColor = (percentage: number) => {
    if (percentage > 10) return 'text-green-600';
    if (percentage > 0) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getVarianceIcon = (percentage: number) => {
    if (percentage > 0) return <TrendingUp className="h-4 w-4" />;
    return <TrendingDown className="h-4 w-4" />;
  };

  // Load job costs when project changes
  useEffect(() => {
    if (selectedProject) {
      loadJobCosts(selectedProject);
    }
  }, [selectedProject]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Loading job costs...</p>
        </div>
      </div>
    );
  }

  const currentProject = projects.find(p => p.id === selectedProject);

  return (
    <div className="space-y-6">
      {/* Project Selection */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold">Real-Time Job Costing</h2>
          <p className="text-muted-foreground">Track and monitor project costs in real-time</p>
        </div>
        
        <Select value={selectedProject} onValueChange={handleProjectChange}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Select project" />
          </SelectTrigger>
          <SelectContent>
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedProject && currentProject && (
        <>
          {/* Cost Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Cost</p>
                    <p className="text-2xl font-bold">${costSummary.totalCost.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">
                      Budget: ${currentProject.budget?.toLocaleString() || '0'}
                    </p>
                  </div>
                  <DollarSign className="h-8 w-8 text-primary" />
                </div>
                <Progress 
                  value={currentProject.budget ? (costSummary.totalCost / currentProject.budget) * 100 : 0} 
                  className="mt-3" 
                />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Labor Cost</p>
                    <p className="text-2xl font-bold">${costSummary.laborCost.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">
                      {costSummary.totalCost > 0 ? Math.round((costSummary.laborCost / costSummary.totalCost) * 100) : 0}% of total
                    </p>
                  </div>
                  <Users className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Material Cost</p>
                    <p className="text-2xl font-bold">${costSummary.materialCost.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">
                      {costSummary.totalCost > 0 ? Math.round((costSummary.materialCost / costSummary.totalCost) * 100) : 0}% of total
                    </p>
                  </div>
                  <Package className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Budget Variance</p>
                    <p className={`text-2xl font-bold ${getVarianceColor(costSummary.budgetVariancePercentage)}`}>
                      ${Math.abs(costSummary.budgetVariance).toLocaleString()}
                    </p>
                    <p className={`text-xs ${getVarianceColor(costSummary.budgetVariancePercentage)} flex items-center`}>
                      {getVarianceIcon(costSummary.budgetVariancePercentage)}
                      <span className="ml-1">
                        {Math.abs(costSummary.budgetVariancePercentage).toFixed(1)}%
                      </span>
                    </p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Budget Alert */}
          {costSummary.budgetVariancePercentage < -10 && (
            <Alert className="border-red-500 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <strong>Budget Alert:</strong> This project is over budget by ${Math.abs(costSummary.budgetVariance).toLocaleString()} 
                ({Math.abs(costSummary.budgetVariancePercentage).toFixed(1)}%). Consider reviewing costs and adjusting the project scope.
              </AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue="costs" className="space-y-4">
            <TabsList>
              <TabsTrigger value="costs">Job Costs</TabsTrigger>
              <TabsTrigger value="add">Add Cost</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>

            <TabsContent value="costs" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Cost Entries ({jobCosts.length})</h3>
                <Badge variant="outline">
                  Last updated: {jobCosts.length > 0 ? new Date(jobCosts[0].created_at).toLocaleString() : 'No entries'}
                </Badge>
              </div>

              {jobCosts.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No job costs recorded yet</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Add your first cost entry to start tracking
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {jobCosts.map((cost) => (
                    <Card key={cost.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <Badge variant="outline">
                                {cost.cost_codes?.code}
                              </Badge>
                              <span className="font-medium">{cost.cost_codes?.name}</span>
                              <span className="text-sm text-muted-foreground">
                                {new Date(cost.date).toLocaleDateString()}
                              </span>
                            </div>
                            
                            {cost.description && (
                              <p className="text-sm text-muted-foreground mb-2">{cost.description}</p>
                            )}
                            
                            <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 text-sm">
                              <div>
                                <span className="text-muted-foreground">Labor:</span>
                                <p className="font-medium">${cost.labor_cost?.toLocaleString() || '0'}</p>
                                {cost.labor_hours > 0 && (
                                  <p className="text-xs text-muted-foreground">{cost.labor_hours}h</p>
                                )}
                              </div>
                              <div>
                                <span className="text-muted-foreground">Materials:</span>
                                <p className="font-medium">${cost.material_cost?.toLocaleString() || '0'}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Equipment:</span>
                                <p className="font-medium">${cost.equipment_cost?.toLocaleString() || '0'}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Other:</span>
                                <p className="font-medium">${cost.other_cost?.toLocaleString() || '0'}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Total:</span>
                                <p className="font-bold text-lg">${cost.total_cost?.toLocaleString() || '0'}</p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="add" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Add New Job Cost</CardTitle>
                  <CardDescription>
                    Record costs for labor, materials, equipment, and other expenses
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Cost Code *</Label>
                      <Select 
                        value={newCostForm.cost_code_id} 
                        onValueChange={(value) => updateFormField('cost_code_id', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select cost code" />
                        </SelectTrigger>
                        <SelectContent>
                          {costCodes.map((code) => (
                            <SelectItem key={code.id} value={code.id}>
                              {code.code} - {code.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Date</Label>
                      <Input
                        type="date"
                        value={newCostForm.date}
                        onChange={(e) => updateFormField('date', e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>Labor Hours</Label>
                      <Input
                        type="number"
                        step="0.5"
                        min="0"
                        value={newCostForm.labor_hours}
                        onChange={(e) => updateFormField('labor_hours', e.target.value)}
                        placeholder="0"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Labor Cost</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={newCostForm.labor_cost}
                        onChange={(e) => updateFormField('labor_cost', e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Material Cost</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={newCostForm.material_cost}
                        onChange={(e) => updateFormField('material_cost', e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Equipment Cost</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={newCostForm.equipment_cost}
                        onChange={(e) => updateFormField('equipment_cost', e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Other Cost</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={newCostForm.other_cost}
                        onChange={(e) => updateFormField('other_cost', e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Total Cost</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={
                          (parseFloat(newCostForm.labor_cost) || 0) +
                          (parseFloat(newCostForm.material_cost) || 0) +
                          (parseFloat(newCostForm.equipment_cost) || 0) +
                          (parseFloat(newCostForm.other_cost) || 0)
                        }
                        readOnly
                        className="bg-muted"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={newCostForm.description}
                      onChange={(e) => updateFormField('description', e.target.value)}
                      placeholder="Describe the work performed or materials used..."
                      rows={3}
                    />
                  </div>
                  
                  <Button 
                    onClick={addJobCost}
                    disabled={addingCost || !newCostForm.cost_code_id}
                    className="w-full"
                  >
                    {addingCost ? 'Adding...' : 'Add Job Cost'}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Cost Breakdown by Category</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {[
                        { name: 'Labor', value: costSummary.laborCost, icon: Users, color: 'bg-blue-500' },
                        { name: 'Materials', value: costSummary.materialCost, icon: Package, color: 'bg-green-500' },
                        { name: 'Equipment', value: costSummary.equipmentCost, icon: Wrench, color: 'bg-orange-500' },
                        { name: 'Other', value: costSummary.otherCost, icon: DollarSign, color: 'bg-purple-500' }
                      ].map(({ name, value, icon: Icon, color }) => {
                        const percentage = costSummary.totalCost > 0 ? (value / costSummary.totalCost) * 100 : 0;
                        return (
                          <div key={name} className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <div className={`w-3 h-3 rounded-full ${color}`} />
                              <Icon className="h-4 w-4" />
                              <span className="font-medium">{name}</span>
                            </div>
                            <div className="text-right">
                              <p className="font-bold">${value.toLocaleString()}</p>
                              <p className="text-sm text-muted-foreground">{percentage.toFixed(1)}%</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Project Health</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Budget Usage</span>
                          <span>{currentProject.budget ? ((costSummary.totalCost / currentProject.budget) * 100).toFixed(1) : 0}%</span>
                        </div>
                        <Progress value={currentProject.budget ? (costSummary.totalCost / currentProject.budget) * 100 : 0} />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Budget</p>
                          <p className="font-bold text-lg">${currentProject.budget?.toLocaleString() || '0'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Spent</p>
                          <p className="font-bold text-lg">${costSummary.totalCost.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Remaining</p>
                          <p className={`font-bold text-lg ${costSummary.budgetVariance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ${Math.abs(costSummary.budgetVariance).toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Status</p>
                          <Badge variant={costSummary.budgetVariance >= 0 ? 'default' : 'destructive'}>
                            {costSummary.budgetVariance >= 0 ? 'On Budget' : 'Over Budget'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
};

export default RealTimeJobCosting;
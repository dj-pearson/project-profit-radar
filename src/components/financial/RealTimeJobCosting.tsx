import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';
import { useRealTimeJobCosting, summarizeJobCosts, type JobCostWrite } from '@/hooks/useRealTimeJobCosting';
import { ErrorState } from '@/components/common/ErrorState';
import { DollarSign, TrendingUp, TrendingDown, AlertTriangle, Users, Package, BarChart3, Edit, Save, X } from 'lucide-react';
import { DashboardSkeleton, LoadingRegion } from '@/components/ui/skeletons';

import type { JobCost } from './job-costing/types';
import { AddCostTab } from './job-costing/AddCostTab';
import { CostAnalyticsTab } from './job-costing/CostAnalyticsTab';

interface RealTimeJobCostingProps {
  projectId?: string;
}

const RealTimeJobCosting: React.FC<RealTimeJobCostingProps> = ({ projectId }) => {
  const [pickedProject, setSelectedProject] = useState<string>(projectId || '');
  const [editingCost, setEditingCost] = useState<string | null>(null);

  const data = useRealTimeJobCosting(pickedProject || undefined);
  const projects = useMemo(() => data.pickers.data?.projects ?? [], [data.pickers.data]);
  const costCodes = data.pickers.data?.costCodes ?? [];
  const jobCosts = useMemo(() => data.costs.data ?? [], [data.costs.data]);
  // With no project chosen yet, the newest one is shown.
  const selectedProject = data.projectId ?? '';
  const loading = data.pickers.isLoading;
  const addingCost = data.add.isPending;

  // Add cost form state
  const [newCostForm, setNewCostForm] = useState({
    project_id: projectId || '',
    cost_code_id: '',
    date: new Date().toISOString().split('T')[0],
    labor_hours: '',
    labor_cost: '',
    material_cost: '',
    equipment_cost: '',
    other_cost: '',
    description: ''
  });

  // Edit cost form state
  const [editCostForm, setEditCostForm] = useState({
    project_id: '',
    cost_code_id: '',
    date: '',
    labor_hours: '',
    labor_cost: '',
    material_cost: '',
    equipment_cost: '',
    other_cost: '',
    description: ''
  });

  // Memoized current project lookup
  const currentProject = useMemo(() =>
    projects.find(p => p.id === selectedProject),
    [projects, selectedProject]
  );

  const costSummary = useMemo(
    () => summarizeJobCosts(jobCosts, currentProject?.budget),
    [jobCosts, currentProject],
  );

  const handleProjectChange = (projectId: string) => {
    setSelectedProject(projectId);
  };

  const addJobCost = async () => {
    if (!newCostForm.project_id || !newCostForm.cost_code_id) return;

    try {
      const laborCost = parseFloat(newCostForm.labor_cost) || 0;
      const materialCost = parseFloat(newCostForm.material_cost) || 0;
      const equipmentCost = parseFloat(newCostForm.equipment_cost) || 0;
      const otherCost = parseFloat(newCostForm.other_cost) || 0;
      const totalCost = laborCost + materialCost + equipmentCost + otherCost;

      const costData: JobCostWrite = {
        project_id: newCostForm.project_id,
        cost_code_id: newCostForm.cost_code_id,
        date: newCostForm.date,
        labor_hours: parseFloat(newCostForm.labor_hours) || 0,
        labor_cost: laborCost,
        material_cost: materialCost,
        equipment_cost: equipmentCost,
        other_cost: otherCost,
        description: newCostForm.description || null,
      };

      await data.add.mutateAsync(costData);

      // Update selected project to match the form's project
      setSelectedProject(newCostForm.project_id);

      // Reset form
      setNewCostForm({
        project_id: newCostForm.project_id, // Keep the same project selected
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

    } catch (error: unknown) {
      toast({
        variant: "destructive",
        title: "Cost not added",
        description: error instanceof Error ? error.message : "Failed to add job cost"
      });
    }
  };

  const updateFormField = (field: string, value: string) => {
    setNewCostForm(prev => ({ ...prev, [field]: value }));
  };

  const updateEditFormField = (field: string, value: string) => {
    setEditCostForm(prev => ({ ...prev, [field]: value }));
  };

  const startEditingCost = (cost: JobCost) => {
    setEditingCost(cost.id);
    setEditCostForm({
      project_id: cost.project_id,
      cost_code_id: cost.cost_code_id,
      date: cost.date,
      labor_hours: cost.labor_hours.toString(),
      labor_cost: cost.labor_cost.toString(),
      material_cost: cost.material_cost.toString(),
      equipment_cost: cost.equipment_cost.toString(),
      other_cost: cost.other_cost.toString(),
      description: cost.description || ''
    });
  };

  const cancelEditing = () => {
    setEditingCost(null);
    setEditCostForm({
      project_id: '',
      cost_code_id: '',
      date: '',
      labor_hours: '',
      labor_cost: '',
      material_cost: '',
      equipment_cost: '',
      other_cost: '',
      description: ''
    });
  };

  const updateJobCost = async () => {
    if (!editingCost) return;

    try {
      const laborCost = parseFloat(editCostForm.labor_cost) || 0;
      const materialCost = parseFloat(editCostForm.material_cost) || 0;
      const equipmentCost = parseFloat(editCostForm.equipment_cost) || 0;
      const otherCost = parseFloat(editCostForm.other_cost) || 0;

      const costData: JobCostWrite = {
        project_id: editCostForm.project_id,
        cost_code_id: editCostForm.cost_code_id,
        date: editCostForm.date,
        labor_hours: parseFloat(editCostForm.labor_hours) || 0,
        labor_cost: laborCost,
        material_cost: materialCost,
        equipment_cost: equipmentCost,
        other_cost: otherCost,
        description: editCostForm.description || null
      };

      await data.update.mutateAsync({ id: editingCost, row: costData });

      cancelEditing();
      
      toast({
        title: "Cost Updated",
        description: "Job cost has been successfully updated"
      });

    } catch (error: unknown) {
      toast({
        variant: "destructive",
        title: "Cost not updated",
        description: error instanceof Error ? error.message : "Failed to update job cost"
      });
    }
  };

  // Memoized helper functions
  const getVarianceColor = useCallback((percentage: number) => {
    if (percentage > 10) return 'text-green-600';
    if (percentage > 0) return 'text-yellow-600';
    return 'text-red-600';
  }, []);

  const getVarianceIcon = useCallback((percentage: number) => {
    if (percentage > 0) return <TrendingUp className="h-4 w-4" />;
    return <TrendingDown className="h-4 w-4" />;
  }, []);

  if (loading) {
    return (
      <LoadingRegion label="Loading job costs" className="p-8">
        <DashboardSkeleton />
      </LoadingRegion>
    );
  }

  if (data.pickers.error) {
    return (
      <ErrorState
        title="Job costing could not be loaded"
        error={data.pickers.error as Error}
        onRetry={() => { void data.pickers.refetch(); }}
      />
    );
  }

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

      {selectedProject && currentProject && data.costs.error && (
        // No figures from a failed read: "$0 spent" against the full budget
        // is a healthy project that may not exist.
        <ErrorState
          title="Job costs could not be loaded"
          error={data.costs.error as Error}
          onRetry={() => { void data.costs.refetch(); }}
        />
      )}

      {selectedProject && currentProject && !data.costs.error && (
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
                        {editingCost === cost.id ? (
                          // Edit mode
                          <div className="space-y-4">
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="font-medium">Edit Job Cost</h4>
                              <div className="flex space-x-2">
                                <Button variant="ghost" size="sm" onClick={cancelEditing}>
                                  <X className="h-4 w-4" />
                                </Button>
                                <Button variant="default" size="sm" onClick={updateJobCost}>
                                  <Save className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            
                             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                               <div className="space-y-2">
                                 <Label>Project *</Label>
                                 <Select 
                                   value={editCostForm.project_id} 
                                   onValueChange={(value) => updateEditFormField('project_id', value)}
                                 >
                                   <SelectTrigger>
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
                               
                               <div className="space-y-2">
                                 <Label>Cost Code *</Label>
                                 <Select 
                                   value={editCostForm.cost_code_id} 
                                   onValueChange={(value) => updateEditFormField('cost_code_id', value)}
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
                                   value={editCostForm.date}
                                   onChange={(e) => updateEditFormField('date', e.target.value)}
                                 />
                               </div>
                             </div>
                            
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                              <div className="space-y-2">
                                <Label>Labor Hours</Label>
                                <Input
                                  type="number"
                                  step="0.5"
                                  min="0"
                                  value={editCostForm.labor_hours}
                                  onChange={(e) => updateEditFormField('labor_hours', e.target.value)}
                                />
                              </div>
                              
                              <div className="space-y-2">
                                <Label>Labor Cost</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={editCostForm.labor_cost}
                                  onChange={(e) => updateEditFormField('labor_cost', e.target.value)}
                                />
                              </div>
                              
                              <div className="space-y-2">
                                <Label>Material Cost</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={editCostForm.material_cost}
                                  onChange={(e) => updateEditFormField('material_cost', e.target.value)}
                                />
                              </div>
                              
                              <div className="space-y-2">
                                <Label>Equipment Cost</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={editCostForm.equipment_cost}
                                  onChange={(e) => updateEditFormField('equipment_cost', e.target.value)}
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
                                  value={editCostForm.other_cost}
                                  onChange={(e) => updateEditFormField('other_cost', e.target.value)}
                                />
                              </div>
                              
                              <div className="space-y-2">
                                <Label>Total Cost</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={
                                    (parseFloat(editCostForm.labor_cost) || 0) +
                                    (parseFloat(editCostForm.material_cost) || 0) +
                                    (parseFloat(editCostForm.equipment_cost) || 0) +
                                    (parseFloat(editCostForm.other_cost) || 0)
                                  }
                                  readOnly
                                  className="bg-muted"
                                />
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              <Label>Description</Label>
                              <Textarea
                                value={editCostForm.description}
                                onChange={(e) => updateEditFormField('description', e.target.value)}
                                rows={2}
                              />
                            </div>
                          </div>
                        ) : (
                          // Display mode
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <Badge variant="outline">
                                  {cost.cost_code_id}
                                </Badge>
                                <span className="font-medium">Cost Entry</span>
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
                              <Button variant="ghost" size="sm" onClick={() => startEditingCost(cost)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="add" className="space-y-4">
              <AddCostTab
                projects={projects}
                newCostForm={newCostForm}
                updateFormField={updateFormField}
                costCodes={costCodes}
                addJobCost={addJobCost}
                addingCost={addingCost}
              />
            </TabsContent>

            <TabsContent value="analytics" className="space-y-4">
              <CostAnalyticsTab
                costSummary={costSummary}
                currentProject={currentProject}
              />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
};

export default RealTimeJobCosting;
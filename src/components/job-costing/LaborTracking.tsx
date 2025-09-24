import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Clock, User, DollarSign, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface LaborTrackingProps {
  projectId: string;
}

interface LaborEntry {
  id: string;
  employee_id?: string;
  employee_name: string;
  hours_worked: number;
  hourly_rate: number;
  overtime_hours: number;
  overtime_rate: number;
  total_labor_cost: number;
  burden_rate: number;
  total_cost_with_burden: number;
  work_date: string;
  description: string;
  cost_code_id?: string;
}

interface CostCode {
  id: string;
  code: string;
  name: string;
  category: string;
}

export const LaborTracking: React.FC<LaborTrackingProps> = ({ projectId }) => {
  const { toast } = useToast();
  const [laborEntries, setLaborEntries] = useState<LaborEntry[]>([]);
  const [costCodes, setCostCodes] = useState<CostCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    if (projectId) {
      loadData();
    }
  }, [projectId]);

  const loadData = async () => {
    try {
      // Load labor entries
      const { data: laborData, error: laborError } = await supabase
        .from('labor_costs')
        .select('*')
        .eq('project_id', projectId)
        .order('work_date', { ascending: false });

      if (laborError) throw laborError;

      // Load cost codes
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('company_id')
        .eq('id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (userProfile) {
        const { data: costCodeData, error: costCodeError } = await supabase
          .from('cost_codes')
          .select('*')
          .eq('company_id', userProfile.company_id)
          .eq('category', 'labor')
          .eq('is_active', true)
          .order('code');

        if (costCodeError) throw costCodeError;
        setCostCodes(costCodeData || []);
      }

      setLaborEntries(laborData || []);
    } catch (error) {
      console.error('Error loading labor data:', error);
      toast({
        title: "Error",
        description: "Failed to load labor data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddLaborEntry = async (entryData: Partial<LaborEntry>) => {
    try {
      const regularPay = entryData.hours_worked! * entryData.hourly_rate!;
      const overtimePay = (entryData.overtime_hours || 0) * (entryData.overtime_rate || entryData.hourly_rate! * 1.5);
      const totalLaborCost = regularPay + overtimePay;
      const burdenAmount = totalLaborCost * ((entryData.burden_rate || 0) / 100);
      const totalCostWithBurden = totalLaborCost + burdenAmount;

      const laborEntry = {
        project_id: projectId,
        employee_name: entryData.employee_name || '',
        hours_worked: entryData.hours_worked || 0,
        hourly_rate: entryData.hourly_rate || 0,
        overtime_hours: entryData.overtime_hours || 0,
        overtime_rate: entryData.overtime_rate || (entryData.hourly_rate || 0) * 1.5,
        total_labor_cost: totalLaborCost,
        burden_rate: entryData.burden_rate || 0,
        total_cost_with_burden: totalCostWithBurden,
        work_date: entryData.work_date || new Date().toISOString().split('T')[0],
        description: entryData.description || '',
        cost_code_id: entryData.cost_code_id || null
      };

      const { error } = await supabase
        .from('labor_costs')
        .insert(laborEntry);

      if (error) throw error;

      await loadData();
      setIsDialogOpen(false);
      
      toast({
        title: "Success",
        description: "Labor entry added successfully",
      });
    } catch (error) {
      console.error('Error adding labor entry:', error);
      toast({
        title: "Error",
        description: "Failed to add labor entry",
        variant: "destructive",
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getTotalLaborCosts = () => {
    return laborEntries.reduce((total, entry) => total + entry.total_cost_with_burden, 0);
  };

  const getTotalHours = () => {
    return laborEntries.reduce((total, entry) => total + entry.hours_worked + (entry.overtime_hours || 0), 0);
  };

  const LaborEntryForm = ({ onSave, onCancel }: {
    onSave: (entry: Partial<LaborEntry>) => void;
    onCancel: () => void;
  }) => {
    const [formData, setFormData] = useState({
      employee_name: '',
      hours_worked: 8,
      hourly_rate: 25,
      overtime_hours: 0,
      overtime_rate: 37.5,
      burden_rate: 30,
      work_date: format(new Date(), 'yyyy-MM-dd'),
      description: '',
      cost_code_id: ''
    });

    const regularPay = formData.hours_worked * formData.hourly_rate;
    const overtimePay = formData.overtime_hours * formData.overtime_rate;
    const totalLaborCost = regularPay + overtimePay;
    const burdenAmount = totalLaborCost * (formData.burden_rate / 100);
    const totalCostWithBurden = totalLaborCost + burdenAmount;

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="employee">Employee Name</Label>
            <Input
              id="employee"
              value={formData.employee_name}
              onChange={(e) => setFormData({...formData, employee_name: e.target.value})}
              placeholder="Enter employee name"
            />
          </div>
          
          <div>
            <Label htmlFor="work-date">Work Date</Label>
            <Input
              id="work-date"
              type="date"
              value={formData.work_date}
              onChange={(e) => setFormData({...formData, work_date: e.target.value})}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="cost-code">Cost Code (Optional)</Label>
          <Select value={formData.cost_code_id} onValueChange={(value) => setFormData({...formData, cost_code_id: value})}>
            <SelectTrigger>
              <SelectValue placeholder="Select cost code" />
            </SelectTrigger>
            <SelectContent>
              {costCodes.map(code => (
                <SelectItem key={code.id} value={code.id}>
                  {code.code} - {code.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Input
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            placeholder="Enter work description"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="hours">Regular Hours</Label>
            <Input
              id="hours"
              type="number"
              step="0.25"
              value={formData.hours_worked}
              onChange={(e) => setFormData({...formData, hours_worked: parseFloat(e.target.value) || 0})}
            />
          </div>
          
          <div>
            <Label htmlFor="hourly-rate">Hourly Rate</Label>
            <Input
              id="hourly-rate"
              type="number"
              step="0.01"
              value={formData.hourly_rate}
              onChange={(e) => setFormData({...formData, hourly_rate: parseFloat(e.target.value) || 0})}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="overtime-hours">Overtime Hours</Label>
            <Input
              id="overtime-hours"
              type="number"
              step="0.25"
              value={formData.overtime_hours}
              onChange={(e) => setFormData({...formData, overtime_hours: parseFloat(e.target.value) || 0})}
            />
          </div>
          
          <div>
            <Label htmlFor="overtime-rate">Overtime Rate</Label>
            <Input
              id="overtime-rate"
              type="number"
              step="0.01"
              value={formData.overtime_rate}
              onChange={(e) => setFormData({...formData, overtime_rate: parseFloat(e.target.value) || 0})}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="burden-rate">Burden Rate (%)</Label>
          <Input
            id="burden-rate"
            type="number"
            step="0.1"
            value={formData.burden_rate}
            onChange={(e) => setFormData({...formData, burden_rate: parseFloat(e.target.value) || 0})}
            placeholder="Benefits, taxes, insurance (percentage)"
          />
        </div>

        <div className="p-4 bg-muted rounded-lg space-y-2">
          <div className="flex justify-between text-sm">
            <span>Regular Pay:</span>
            <span>{formatCurrency(regularPay)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Overtime Pay:</span>
            <span>{formatCurrency(overtimePay)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Labor Subtotal:</span>
            <span>{formatCurrency(totalLaborCost)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Burden ({formData.burden_rate}%):</span>
            <span>{formatCurrency(burdenAmount)}</span>
          </div>
          <div className="flex justify-between font-medium border-t pt-2">
            <span>Total Cost:</span>
            <span>{formatCurrency(totalCostWithBurden)}</span>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={() => onSave(formData)}>
            Add Labor Entry
          </Button>
        </div>
      </div>
    );
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Labor Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Labor Cost</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(getTotalLaborCosts())}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Hours</p>
                <p className="text-2xl font-bold">
                  {getTotalHours().toFixed(1)}
                </p>
              </div>
              <Clock className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Labor Entries</p>
                <p className="text-2xl font-bold">
                  {laborEntries.length}
                </p>
              </div>
              <User className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Labor Entries Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Labor Time Tracking</CardTitle>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Labor Entry
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add Labor Entry</DialogTitle>
                </DialogHeader>
                <LaborEntryForm
                  onSave={handleAddLaborEntry}
                  onCancel={() => setIsDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Date</th>
                  <th className="text-left p-2">Employee</th>
                  <th className="text-left p-2">Description</th>
                  <th className="text-right p-2">Hours</th>
                  <th className="text-right p-2">Rate</th>
                  <th className="text-right p-2">OT Hours</th>
                  <th className="text-right p-2">Total Cost</th>
                </tr>
              </thead>
              <tbody>
                {laborEntries.map((entry) => (
                  <tr key={entry.id} className="border-b hover:bg-muted/50">
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {format(new Date(entry.work_date), 'MMM dd, yyyy')}
                      </div>
                    </td>
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        {entry.employee_name}
                      </div>
                    </td>
                    <td className="p-2">{entry.description}</td>
                    <td className="p-2 text-right">
                      <Badge variant="outline">
                        {entry.hours_worked}h
                      </Badge>
                    </td>
                    <td className="p-2 text-right">{formatCurrency(entry.hourly_rate)}</td>
                    <td className="p-2 text-right">
                      {entry.overtime_hours > 0 && (
                        <Badge variant="secondary">
                          {entry.overtime_hours}h OT
                        </Badge>
                      )}
                    </td>
                    <td className="p-2 text-right font-medium">
                      {formatCurrency(entry.total_cost_with_burden)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {laborEntries.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No labor entries found. Add your first labor entry to start tracking.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
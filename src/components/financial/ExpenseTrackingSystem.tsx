import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Receipt, 
  Plus, 
  DollarSign, 
  Calendar, 
  User, 
  FileText,
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp
} from 'lucide-react';

interface Expense {
  id: string;
  project_id: string;
  project_name?: string;
  category: string;
  amount: number;
  description: string;
  date: string;
  receipt_url?: string;
  status: 'pending' | 'approved' | 'rejected';
  submitted_by: string;
  submitted_by_name?: string;
  created_at: string;
}

interface ExpenseTrackingProps {
  companyId?: string;
  projectId?: string;
}

export const ExpenseTrackingSystem: React.FC<ExpenseTrackingProps> = ({ 
  companyId, 
  projectId 
}) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const { toast } = useToast();

  // New expense form state
  const [newExpense, setNewExpense] = useState({
    project_id: projectId || '',
    category: '',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    receipt_file: null as File | null
  });

  const expenseCategories = [
    'Materials',
    'Labor',
    'Equipment',
    'Subcontractors',
    'Transportation',
    'Permits',
    'Insurance',
    'Utilities',
    'Office Supplies',
    'Other'
  ];

  useEffect(() => {
    loadExpenses();
    if (!projectId) {
      loadProjects();
    }
  }, [companyId, projectId]);

  const loadExpenses = async () => {
    try {
      const { data: userProfile } = await supabase.auth.getUser();
      if (!userProfile.user) return;

      let query = (supabase.from as any)('project_expenses')
        .select('*')
        .order('created_at', { ascending: false });

      if (projectId) {
        query = query.eq('project_id', projectId);
      } else if (companyId) {
        query = query.eq('company_id', companyId);
      }

      const { data, error } = await query;

      if (error) throw error;

      setExpenses((data as any) || []);
    } catch (error) {
      console.error('Error loading expenses:', error);
      toast({
        title: "Error",
        description: "Failed to load expenses",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadProjects = async () => {
    try {
      const { data: userProfile } = await supabase.auth.getUser();
      if (!userProfile.user) return;

      const { data, error } = await supabase
        .from('projects')
        .select('id, name, status')
        .eq('company_id', companyId)
        .in('status', ['active', 'planning', 'in_progress']);

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const handleSubmitExpense = async () => {
    try {
      const { data: userProfile } = await supabase.auth.getUser();
      if (!userProfile.user) return;

      let receiptUrl = null;
      
      // Upload receipt if provided
      if (newExpense.receipt_file) {
        const fileExt = newExpense.receipt_file.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('expense-receipts')
          .upload(fileName, newExpense.receipt_file);

        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('expense-receipts')
          .getPublicUrl(fileName);
        
        receiptUrl = publicUrl;
      }

      const { error } = await (supabase.from as any)('project_expenses')
        .insert({
          project_id: newExpense.project_id,
          company_id: companyId,
          category: newExpense.category,
          amount: parseFloat(newExpense.amount),
          description: newExpense.description,
          date: newExpense.date,
          receipt_url: receiptUrl,
          status: 'pending',
          submitted_by: userProfile.user.id
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Expense submitted successfully"
      });

      setIsDialogOpen(false);
      setNewExpense({
        project_id: projectId || '',
        category: '',
        amount: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        receipt_file: null
      });
      
      loadExpenses();
    } catch (error) {
      console.error('Error submitting expense:', error);
      toast({
        title: "Error",
        description: "Failed to submit expense",
        variant: "destructive"
      });
    }
  };

  const updateExpenseStatus = async (expenseId: string, status: 'approved' | 'rejected') => {
    try {
      const { error } = await (supabase.from as any)('project_expenses')
        .update({ status })
        .eq('id', expenseId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Expense ${status} successfully`
      });

      loadExpenses();
    } catch (error) {
      console.error('Error updating expense:', error);
      toast({
        title: "Error",
        description: "Failed to update expense status",
        variant: "destructive"
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'rejected':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Clock className="h-4 w-4 text-warning" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-success/10 text-success border-success/20';
      case 'rejected':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      default:
        return 'bg-warning/10 text-warning border-warning/20';
    }
  };

  const filteredExpenses = expenses.filter(expense => {
    if (activeTab === 'all') return true;
    return expense.status === activeTab;
  });

  const totalExpenses = expenses.reduce((sum, expense) => 
    expense.status === 'approved' ? sum + expense.amount : sum, 0
  );

  const pendingExpenses = expenses.filter(e => e.status === 'pending').length;

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Approved</p>
                <p className="text-2xl font-semibold">${totalExpenses.toLocaleString()}</p>
              </div>
              <DollarSign className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Review</p>
                <p className="text-2xl font-semibold">{pendingExpenses}</p>
              </div>
              <Clock className="h-8 w-8 text-warning" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">This Month</p>
                <p className="text-2xl font-semibold">
                  {expenses.filter(e => 
                    new Date(e.date).getMonth() === new Date().getMonth() &&
                    e.status === 'approved'
                  ).length}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Expense Tracking
            </CardTitle>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Expense
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Submit New Expense</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {!projectId && (
                    <div className="space-y-2">
                      <Label>Project</Label>
                      <Select 
                        value={newExpense.project_id} 
                        onValueChange={(value) => setNewExpense(prev => ({ ...prev, project_id: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select project" />
                        </SelectTrigger>
                        <SelectContent>
                          {projects.map(project => (
                            <SelectItem key={project.id} value={project.id}>
                              {project.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select 
                      value={newExpense.category} 
                      onValueChange={(value) => setNewExpense(prev => ({ ...prev, category: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {expenseCategories.map(category => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Amount</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={newExpense.amount}
                      onChange={(e) => setNewExpense(prev => ({ ...prev, amount: e.target.value }))}
                      placeholder="0.00"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input
                      value={newExpense.description}
                      onChange={(e) => setNewExpense(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Expense description"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={newExpense.date}
                      onChange={(e) => setNewExpense(prev => ({ ...prev, date: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Receipt (Optional)</Label>
                    <Input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => setNewExpense(prev => ({ 
                        ...prev, 
                        receipt_file: e.target.files?.[0] || null 
                      }))}
                    />
                  </div>

                  <Button 
                    onClick={handleSubmitExpense}
                    disabled={!newExpense.project_id || !newExpense.category || !newExpense.amount}
                    className="w-full"
                  >
                    Submit Expense
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-4">
              <div className="space-y-3">
                {filteredExpenses.length === 0 ? (
                  <div className="text-center py-8">
                    <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No expenses found</p>
                  </div>
                ) : (
                  filteredExpenses.map(expense => (
                    <Card key={expense.id} className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline">{expense.category}</Badge>
                            <Badge className={getStatusColor(expense.status)}>
                              {getStatusIcon(expense.status)}
                              <span className="ml-1 capitalize">{expense.status}</span>
                            </Badge>
                          </div>
                          <h4 className="font-medium">{expense.description}</h4>
                          <p className="text-sm text-muted-foreground">
                            {expense.project_name} • {new Date(expense.date).toLocaleDateString()}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Submitted by {expense.submitted_by_name || 'Unknown'}
                          </p>
                        </div>
                        <div className="text-right ml-4">
                          <p className="text-lg font-semibold">${expense.amount.toLocaleString()}</p>
                          {expense.status === 'pending' && (
                            <div className="flex gap-2 mt-2">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => updateExpenseStatus(expense.id, 'approved')}
                              >
                                Approve
                              </Button>
                              <Button 
                                size="sm" 
                                variant="destructive"
                                onClick={() => updateExpenseStatus(expense.id, 'rejected')}
                              >
                                Reject
                              </Button>
                            </div>
                          )}
                          {expense.receipt_url && (
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="mt-1"
                              onClick={() => window.open(expense.receipt_url, '_blank')}
                            >
                              <FileText className="h-4 w-4 mr-1" />
                              Receipt
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
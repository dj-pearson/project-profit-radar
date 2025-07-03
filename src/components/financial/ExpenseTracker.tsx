import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { 
  Receipt, 
  Plus, 
  Filter,
  Download,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';

interface Expense {
  id: string;
  amount: number;
  description: string;
  expense_date: string;
  vendor_name: string;
  payment_method: string;
  payment_status: string;
  is_billable: boolean;
  tax_amount: number;
  category: { name: string } | null;
  project: { name: string } | null;
  cost_code: { code: string; name: string } | null;
  receipt_file_path: string | null;
}

interface ExpenseCategory {
  id: string;
  name: string;
}

interface Project {
  id: string;
  name: string;
}

interface CostCode {
  id: string;
  code: string;
  name: string;
}

export const ExpenseTracker: React.FC = () => {
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [costCodes, setCostCodes] = useState<CostCode[]>([]);
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');

  // New expense form state
  const [newExpense, setNewExpense] = useState({
    amount: 0,
    description: '',
    expense_date: new Date().toISOString().split('T')[0],
    vendor_name: '',
    vendor_contact: '',
    payment_method: 'credit_card',
    payment_status: 'pending',
    is_billable: false,
    tax_amount: 0,
    category_id: '',
    project_id: '',
    cost_code_id: ''
  });

  useEffect(() => {
    if (userProfile?.company_id) {
      loadExpenses();
      loadCategories();
      loadProjects();
      loadCostCodes();
    }
  }, [userProfile]);

  const loadExpenses = async () => {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select(`
          *,
          expense_categories!category_id(name),
          projects!project_id(name),
          cost_codes!cost_code_id(code, name)
        `)
        .eq('company_id', userProfile?.company_id)
        .order('expense_date', { ascending: false });

      if (error) throw error;
      
      // Transform the data to match our interface
      const transformedData = (data || []).map(expense => ({
        ...expense,
        category: expense.expense_categories,
        project: expense.projects,
        cost_code: expense.cost_codes
      }));
      
      setExpenses(transformedData);
    } catch (error: any) {
      console.error('Error loading expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('expense_categories')
        .select('*')
        .eq('company_id', userProfile?.company_id)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error: any) {
      console.error('Error loading categories:', error);
    }
  };

  const loadProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .eq('company_id', userProfile?.company_id)
        .order('name');

      if (error) throw error;
      setProjects(data || []);
    } catch (error: any) {
      console.error('Error loading projects:', error);
    }
  };

  const loadCostCodes = async () => {
    try {
      const { data, error } = await supabase
        .from('cost_codes')
        .select('id, code, name')
        .eq('company_id', userProfile?.company_id)
        .eq('is_active', true)
        .order('code');

      if (error) throw error;
      setCostCodes(data || []);
    } catch (error: any) {
      console.error('Error loading cost codes:', error);
    }
  };

  const addExpense = async () => {
    try {
      const { error } = await supabase
        .from('expenses')
        .insert([{
          ...newExpense,
          company_id: userProfile?.company_id,
          created_by: userProfile?.id
        }]);

      if (error) throw error;

      toast({
        title: "Expense Added",
        description: "Expense has been successfully recorded."
      });

      setIsAddingExpense(false);
      setNewExpense({
        amount: 0,
        description: '',
        expense_date: new Date().toISOString().split('T')[0],
        vendor_name: '',
        vendor_contact: '',
        payment_method: 'credit_card',
        payment_status: 'pending',
        is_billable: false,
        tax_amount: 0,
        category_id: '',
        project_id: '',
        cost_code_id: ''
      });

      loadExpenses();
    } catch (error: any) {
      console.error('Error adding expense:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add expense"
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'pending': return <Clock className="h-4 w-4 text-orange-500" />;
      case 'overdue': return <AlertCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'default';
      case 'pending': return 'secondary';
      case 'overdue': return 'destructive';
      default: return 'outline';
    }
  };

  const filteredExpenses = expenses.filter(expense => {
    const statusMatch = filterStatus === 'all' || expense.payment_status === filterStatus;
    const categoryMatch = filterCategory === 'all' || expense.category?.name === filterCategory;
    return statusMatch && categoryMatch;
  });

  const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const paidExpenses = filteredExpenses.filter(e => e.payment_status === 'paid').reduce((sum, expense) => sum + expense.amount, 0);
  const pendingExpenses = filteredExpenses.filter(e => e.payment_status === 'pending').reduce((sum, expense) => sum + expense.amount, 0);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">Loading expenses...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Expense Tracker
          </CardTitle>
          <div className="flex items-center gap-2">
            <Dialog open={isAddingExpense} onOpenChange={setIsAddingExpense}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Expense
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add New Expense</DialogTitle>
                  <DialogDescription>
                    Record a new business expense
                  </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount *</Label>
                    <Input
                      id="amount"
                      type="number"
                      value={newExpense.amount}
                      onChange={(e) => setNewExpense({...newExpense, amount: parseFloat(e.target.value) || 0})}
                      step="0.01"
                      min="0"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expense_date">Date *</Label>
                    <Input
                      id="expense_date"
                      type="date"
                      value={newExpense.expense_date}
                      onChange={(e) => setNewExpense({...newExpense, expense_date: e.target.value})}
                      required
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="description">Description *</Label>
                    <Textarea
                      id="description"
                      value={newExpense.description}
                      onChange={(e) => setNewExpense({...newExpense, description: e.target.value})}
                      placeholder="Describe the expense"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vendor_name">Vendor</Label>
                    <Input
                      id="vendor_name"
                      value={newExpense.vendor_name}
                      onChange={(e) => setNewExpense({...newExpense, vendor_name: e.target.value})}
                      placeholder="Vendor name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select value={newExpense.category_id} onValueChange={(value) => setNewExpense({...newExpense, category_id: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="project">Project</Label>
                    <Select value={newExpense.project_id} onValueChange={(value) => setNewExpense({...newExpense, project_id: value})}>
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
                    <Label htmlFor="cost_code">Cost Code</Label>
                    <Select value={newExpense.cost_code_id} onValueChange={(value) => setNewExpense({...newExpense, cost_code_id: value})}>
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
                    <Label htmlFor="payment_method">Payment Method</Label>
                    <Select value={newExpense.payment_method} onValueChange={(value) => setNewExpense({...newExpense, payment_method: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="credit_card">Credit Card</SelectItem>
                        <SelectItem value="debit_card">Debit Card</SelectItem>
                        <SelectItem value="check">Check</SelectItem>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="payment_status">Payment Status</Label>
                    <Select value={newExpense.payment_status} onValueChange={(value) => setNewExpense({...newExpense, payment_status: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="overdue">Overdue</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tax_amount">Tax Amount</Label>
                    <Input
                      id="tax_amount"
                      type="number"
                      value={newExpense.tax_amount}
                      onChange={(e) => setNewExpense({...newExpense, tax_amount: parseFloat(e.target.value) || 0})}
                      step="0.01"
                      min="0"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" onClick={() => setIsAddingExpense(false)}>
                    Cancel
                  </Button>
                  <Button onClick={addExpense}>
                    Add Expense
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-muted rounded-lg">
            <div className="text-2xl font-bold">${totalExpenses.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">Total Expenses</div>
          </div>
          <div className="text-center p-4 bg-muted rounded-lg">
            <div className="text-2xl font-bold text-green-600">${paidExpenses.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">Paid</div>
          </div>
          <div className="text-center p-4 bg-muted rounded-lg">
            <div className="text-2xl font-bold text-orange-600">${pendingExpenses.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">Pending</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.name}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Expenses List */}
        <div className="space-y-3">
          {filteredExpenses.length === 0 ? (
            <div className="text-center py-8">
              <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No expenses found matching your filters.</p>
            </div>
          ) : (
            filteredExpenses.map((expense) => (
              <div key={expense.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-medium">{expense.description}</h4>
                      <Badge variant={getStatusColor(expense.payment_status)}>
                        {getStatusIcon(expense.payment_status)}
                        <span className="ml-1 capitalize">{expense.payment_status}</span>
                      </Badge>
                      {expense.is_billable && (
                        <Badge variant="outline">Billable</Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                      <div>
                        <span className="font-medium">Vendor: </span>
                        {expense.vendor_name || 'N/A'}
                      </div>
                      <div>
                        <span className="font-medium">Category: </span>
                        {expense.category?.name || 'Uncategorized'}
                      </div>
                      <div>
                        <span className="font-medium">Project: </span>
                        {expense.project?.name || 'General'}
                      </div>
                      <div>
                        <span className="font-medium">Date: </span>
                        {new Date(expense.expense_date).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold">${expense.amount.toLocaleString()}</div>
                    {expense.tax_amount > 0 && (
                      <div className="text-sm text-muted-foreground">
                        +${expense.tax_amount.toFixed(2)} tax
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};
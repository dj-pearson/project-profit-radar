import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { 
  CheckSquare, 
  PlusCircle,
  ExternalLink,
  Edit,
  Trash2,
  Calendar,
  User,
  MapPin,
  AlertTriangle,
  CheckCircle,
  Clock,
  Play,
  Camera,
  DollarSign,
  Search,
  Filter
} from 'lucide-react';

interface PunchListItem {
  id: string;
  project_id: string;
  item_number: string;
  title: string;
  description: string;
  location?: string;
  category: 'deficiency' | 'incomplete_work' | 'cleanup' | 'touch_up' | 'safety' | 'code_compliance' | 'other';
  priority: 'low' | 'medium' | 'high' | 'critical';
  trade?: string;
  status: 'open' | 'in_progress' | 'completed' | 'verified' | 'closed';
  assigned_to?: string;
  assigned_company?: string;
  date_identified: string;
  target_completion_date?: string;
  date_completed?: string;
  date_verified?: string;
  photo_before_url?: string;
  photo_after_url?: string;
  estimated_cost?: number;
  actual_cost?: number;
  notes?: string;
  completion_notes?: string;
  created_at: string;
  assigned_user?: {
    first_name: string;
    last_name: string;
  };
  created_by_user?: {
    first_name: string;
    last_name: string;
  };
}

interface ProjectPunchListProps {
  projectId: string;
  onNavigate: (path: string) => void;
}

const categories = [
  { value: 'deficiency', label: 'Deficiency', color: 'text-red-600' },
  { value: 'incomplete_work', label: 'Incomplete Work', color: 'text-orange-600' },
  { value: 'cleanup', label: 'Cleanup', color: 'text-yellow-600' },
  { value: 'touch_up', label: 'Touch Up', color: 'text-blue-600' },
  { value: 'safety', label: 'Safety', color: 'text-red-700' },
  { value: 'code_compliance', label: 'Code Compliance', color: 'text-purple-600' },
  { value: 'other', label: 'Other', color: 'text-gray-600' }
];

const priorities = [
  { value: 'low', label: 'Low', color: 'text-green-600' },
  { value: 'medium', label: 'Medium', color: 'text-yellow-600' },
  { value: 'high', label: 'High', color: 'text-orange-600' },
  { value: 'critical', label: 'Critical', color: 'text-red-600' }
];

const trades = [
  'general',
  'electrical',
  'plumbing',
  'hvac',
  'flooring',
  'painting',
  'drywall',
  'roofing',
  'concrete',
  'landscaping',
  'other'
];

export const ProjectPunchList: React.FC<ProjectPunchListProps> = ({
  projectId,
  onNavigate
}) => {
  const { userProfile } = useAuth();
  const [items, setItems] = useState<PunchListItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<PunchListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [showAddItem, setShowAddItem] = useState(false);
  const [editingItem, setEditingItem] = useState<PunchListItem | null>(null);

  const [formData, setFormData] = useState({
    item_number: '',
    title: '',
    description: '',
    location: '',
    category: 'deficiency' as const,
    priority: 'medium' as const,
    trade: '',
    assigned_to: '',
    assigned_company: '',
    target_completion_date: '',
    estimated_cost: '',
    notes: ''
  });

  useEffect(() => {
    if (projectId && userProfile?.company_id) {
      loadItems();
    }
  }, [projectId, userProfile?.company_id]);

  useEffect(() => {
    filterItems();
  }, [items, searchTerm, filterStatus, filterPriority]);

  const loadItems = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('punch_list_items')
        .select(`
          *,
          assigned_user:user_profiles!assigned_to(first_name, last_name),
          created_by_user:user_profiles!created_by(first_name, last_name)
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (error: any) {
      console.error('Error loading punch list items:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load punch list items"
      });
    } finally {
      setLoading(false);
    }
  };

  const filterItems = () => {
    let filtered = items;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.item_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.location?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by status
    if (filterStatus && filterStatus !== 'all') {
      filtered = filtered.filter(item => item.status === filterStatus);
    }

    // Filter by priority
    if (filterPriority && filterPriority !== 'all') {
      filtered = filtered.filter(item => item.priority === filterPriority);
    }

    setFilteredItems(filtered);
  };

  const generateItemNumber = () => {
    const nextNumber = items.length + 1;
    return `PL-${nextNumber.toString().padStart(3, '0')}`;
  };

  const resetForm = () => {
    setFormData({
      item_number: generateItemNumber(),
      title: '',
      description: '',
      location: '',
      category: 'deficiency',
      priority: 'medium',
      trade: '',
      assigned_to: '',
      assigned_company: '',
      target_completion_date: '',
      estimated_cost: '',
      notes: ''
    });
  };

  useEffect(() => {
    if (showAddItem && !editingItem) {
      resetForm();
    }
  }, [showAddItem, items.length]);

  const handleCreateItem = async () => {
    try {
      const itemData = {
        ...formData,
        project_id: projectId,
        company_id: userProfile?.company_id,
        estimated_cost: formData.estimated_cost ? parseFloat(formData.estimated_cost) : null,
        target_completion_date: formData.target_completion_date || null,
        assigned_to: formData.assigned_to || null,
        created_by: userProfile?.id
      };

      const { data, error } = await supabase
        .from('punch_list_items')
        .insert([itemData])
        .select(`
          *,
          assigned_user:user_profiles!assigned_to(first_name, last_name),
          created_by_user:user_profiles!created_by(first_name, last_name)
        `)
        .single();

      if (error) throw error;

      setItems([data, ...items]);
      resetForm();
      setShowAddItem(false);

      toast({
        title: "Success",
        description: "Punch list item added successfully"
      });
    } catch (error: any) {
      console.error('Error creating item:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to add punch list item"
      });
    }
  };

  const handleUpdateItem = async () => {
    if (!editingItem) return;

    try {
      const itemData = {
        ...formData,
        estimated_cost: formData.estimated_cost ? parseFloat(formData.estimated_cost) : null,
        target_completion_date: formData.target_completion_date || null,
        assigned_to: formData.assigned_to || null
      };

      const { data, error } = await supabase
        .from('punch_list_items')
        .update(itemData)
        .eq('id', editingItem.id)
        .select(`
          *,
          assigned_user:user_profiles!assigned_to(first_name, last_name),
          created_by_user:user_profiles!created_by(first_name, last_name)
        `)
        .single();

      if (error) throw error;

      setItems(items.map(i => i.id === editingItem.id ? data : i));
      resetForm();
      setEditingItem(null);

      toast({
        title: "Success",
        description: "Punch list item updated successfully"
      });
    } catch (error: any) {
      console.error('Error updating item:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update punch list item"
      });
    }
  };

  const handleUpdateStatus = async (itemId: string, newStatus: string) => {
    try {
      const updates: any = { status: newStatus };
      
      if (newStatus === 'completed') {
        updates.date_completed = new Date().toISOString().split('T')[0];
        updates.completed_by = userProfile?.id;
      } else if (newStatus === 'verified') {
        updates.date_verified = new Date().toISOString().split('T')[0];
        updates.verified_by = userProfile?.id;
      }

      const { data, error } = await supabase
        .from('punch_list_items')
        .update(updates)
        .eq('id', itemId)
        .select(`
          *,
          assigned_user:user_profiles!assigned_to(first_name, last_name),
          created_by_user:user_profiles!created_by(first_name, last_name)
        `)
        .single();

      if (error) throw error;

      setItems(items.map(i => i.id === itemId ? data : i));
      toast({
        title: "Success",
        description: `Item marked as ${newStatus}`
      });
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update status"
      });
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('punch_list_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      setItems(items.filter(i => i.id !== itemId));
      toast({
        title: "Success",
        description: "Punch list item deleted successfully"
      });
    } catch (error: any) {
      console.error('Error deleting item:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete punch list item"
      });
    }
  };

  const startEdit = (item: PunchListItem) => {
    setFormData({
      item_number: item.item_number,
      title: item.title,
      description: item.description,
      location: item.location || '',
      category: item.category,
      priority: item.priority,
      trade: item.trade || '',
      assigned_to: item.assigned_to || '',
      assigned_company: item.assigned_company || '',
      target_completion_date: item.target_completion_date || '',
      estimated_cost: item.estimated_cost?.toString() || '',
      notes: item.notes || ''
    });
    setEditingItem(item);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'destructive';
      case 'in_progress': return 'secondary';
      case 'completed': return 'outline';
      case 'verified': return 'success';
      case 'closed': return 'success';
      default: return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'in_progress': return <Play className="h-4 w-4 text-blue-600" />;
      case 'completed': return <CheckCircle className="h-4 w-4 text-orange-600" />;
      case 'verified': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'closed': return <CheckSquare className="h-4 w-4 text-green-600" />;
      default: return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getCategoryInfo = (category: string) => {
    return categories.find(c => c.value === category) || categories[categories.length - 1];
  };

  const getPriorityInfo = (priority: string) => {
    return priorities.find(p => p.value === priority) || priorities[1];
  };

  const formatCurrency = (amount?: number) => {
    return amount ? new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount) : 'N/A';
  };

  const getPunchListStats = () => {
    const total = items.length;
    const open = items.filter(i => i.status === 'open').length;
    const inProgress = items.filter(i => i.status === 'in_progress').length;
    const completed = items.filter(i => i.status === 'completed' || i.status === 'verified' || i.status === 'closed').length;
    const critical = items.filter(i => i.priority === 'critical').length;

    return { total, open, inProgress, completed, critical };
  };

  const stats = getPunchListStats();

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
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Items</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <CheckSquare className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Open</p>
                <p className="text-2xl font-bold text-red-600">{stats.open}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
              </div>
              <Play className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Punch List Items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <CheckSquare className="h-5 w-5 mr-2" />
              Punch List ({filteredItems.length})
            </span>
            <div className="flex gap-2">
              <Button 
                size="sm" 
                onClick={() => onNavigate(`/punch-list?project=${projectId}`)}
                variant="outline"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Full View
              </Button>
              <Dialog open={showAddItem} onOpenChange={setShowAddItem}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Add Punch List Item</DialogTitle>
                    <DialogDescription>
                      Add a new item to the project punch list
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="item_number">Item Number</Label>
                        <Input
                          id="item_number"
                          value={formData.item_number}
                          onChange={(e) => setFormData({...formData, item_number: e.target.value})}
                          placeholder="PL-001"
                        />
                      </div>
                      <div>
                        <Label htmlFor="title">Title *</Label>
                        <Input
                          id="title"
                          value={formData.title}
                          onChange={(e) => setFormData({...formData, title: e.target.value})}
                          placeholder="Item title"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="description">Description *</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                        placeholder="Detailed description of the item..."
                        rows={3}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="location">Location</Label>
                        <Input
                          id="location"
                          value={formData.location}
                          onChange={(e) => setFormData({...formData, location: e.target.value})}
                          placeholder="Room 101, 2nd Floor"
                        />
                      </div>
                      <div>
                        <Label htmlFor="trade">Trade</Label>
                        <Select value={formData.trade} onValueChange={(value) => setFormData({...formData, trade: value})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select trade" />
                          </SelectTrigger>
                          <SelectContent>
                            {trades.map((trade) => (
                              <SelectItem key={trade} value={trade}>
                                {trade.charAt(0).toUpperCase() + trade.slice(1)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="category">Category</Label>
                        <Select value={formData.category} onValueChange={(value: any) => setFormData({...formData, category: value})}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((category) => (
                              <SelectItem key={category.value} value={category.value}>
                                {category.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="priority">Priority</Label>
                        <Select value={formData.priority} onValueChange={(value: any) => setFormData({...formData, priority: value})}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {priorities.map((priority) => (
                              <SelectItem key={priority.value} value={priority.value}>
                                {priority.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="target_completion_date">Target Completion</Label>
                        <Input
                          id="target_completion_date"
                          type="date"
                          value={formData.target_completion_date}
                          onChange={(e) => setFormData({...formData, target_completion_date: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="estimated_cost">Estimated Cost</Label>
                        <Input
                          id="estimated_cost"
                          type="number"
                          step="0.01"
                          value={formData.estimated_cost}
                          onChange={(e) => setFormData({...formData, estimated_cost: e.target.value})}
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="assigned_company">Assigned Company</Label>
                      <Input
                        id="assigned_company"
                        value={formData.assigned_company}
                        onChange={(e) => setFormData({...formData, assigned_company: e.target.value})}
                        placeholder="Subcontractor name"
                      />
                    </div>

                    <div>
                      <Label htmlFor="notes">Notes</Label>
                      <Textarea
                        id="notes"
                        value={formData.notes}
                        onChange={(e) => setFormData({...formData, notes: e.target.value})}
                        placeholder="Additional notes..."
                        rows={2}
                      />
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => {
                        setShowAddItem(false);
                        resetForm();
                      }}>
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleCreateItem}
                        disabled={!formData.title || !formData.description}
                      >
                        Add Item
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardTitle>
          <CardDescription>Track project completion items and deficiencies</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search and Filter */}
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search punch list items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filteredItems.length > 0 ? (
            <div className="space-y-4">
              {filteredItems.map((item) => {
                const categoryInfo = getCategoryInfo(item.category);
                const priorityInfo = getPriorityInfo(item.priority);
                
                return (
                  <div key={item.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(item.status)}
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{item.title}</span>
                            <Badge variant="outline">{item.item_number}</Badge>
                            {item.priority === 'critical' && (
                              <Badge variant="destructive">Critical</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{item.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={getStatusColor(item.status) as any}>
                          {item.status.replace('_', ' ')}
                        </Badge>
                        {item.status === 'open' && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleUpdateStatus(item.id, 'in_progress')}
                          >
                            Start
                          </Button>
                        )}
                        {item.status === 'in_progress' && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleUpdateStatus(item.id, 'completed')}
                          >
                            Complete
                          </Button>
                        )}
                        {item.status === 'completed' && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleUpdateStatus(item.id, 'verified')}
                          >
                            Verify
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => startEdit(item)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDeleteItem(item.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center space-x-2">
                        <span className="text-muted-foreground">Category:</span>
                        <Badge variant="outline" className={categoryInfo.color}>
                          {categoryInfo.label}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-muted-foreground">Priority:</span>
                        <Badge variant="outline" className={priorityInfo.color}>
                          {priorityInfo.label}
                        </Badge>
                      </div>
                      {item.location && (
                        <div className="flex items-center space-x-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span>{item.location}</span>
                        </div>
                      )}
                      {item.trade && (
                        <div className="flex items-center space-x-2">
                          <span className="text-muted-foreground">Trade:</span>
                          <span className="capitalize">{item.trade}</span>
                        </div>
                      )}
                    </div>

                    {(item.assigned_company || item.assigned_user || item.target_completion_date) && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        {item.assigned_company && (
                          <div className="flex items-center space-x-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Assigned:</span>
                            <span>{item.assigned_company}</span>
                          </div>
                        )}
                        {item.assigned_user && (
                          <div className="flex items-center space-x-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Assigned:</span>
                            <span>{`${item.assigned_user.first_name} ${item.assigned_user.last_name}`}</span>
                          </div>
                        )}
                        {item.target_completion_date && (
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Due:</span>
                            <span>{new Date(item.target_completion_date).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {item.estimated_cost && (
                      <div className="flex items-center space-x-2 text-sm">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Estimated Cost:</span>
                        <span>{formatCurrency(item.estimated_cost)}</span>
                      </div>
                    )}

                    {item.notes && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Notes:</span>
                        <p className="mt-1">{item.notes}</p>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div>
                        Created {new Date(item.created_at).toLocaleDateString()}
                        {item.created_by_user && (
                          <span> by {`${item.created_by_user.first_name} ${item.created_by_user.last_name}`}</span>
                        )}
                      </div>
                      {item.date_completed && (
                        <div>Completed {new Date(item.date_completed).toLocaleDateString()}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <CheckSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                {searchTerm || filterStatus !== 'all' || filterPriority !== 'all'
                  ? 'No items match your search criteria'
                  : 'No punch list items created yet'
                }
              </p>
              {!searchTerm && filterStatus === 'all' && filterPriority === 'all' && (
                <Button onClick={() => setShowAddItem(true)} variant="outline">
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Create First Item
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Item Dialog */}
      <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Punch List Item</DialogTitle>
            <DialogDescription>
              Update punch list item details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_item_number">Item Number</Label>
                <Input
                  id="edit_item_number"
                  value={formData.item_number}
                  onChange={(e) => setFormData({...formData, item_number: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="edit_title">Title *</Label>
                <Input
                  id="edit_title"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="edit_description">Description *</Label>
              <Textarea
                id="edit_description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_category">Category</Label>
                <Select value={formData.category} onValueChange={(value: any) => setFormData({...formData, category: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit_priority">Priority</Label>
                <Select value={formData.priority} onValueChange={(value: any) => setFormData({...formData, priority: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {priorities.map((priority) => (
                      <SelectItem key={priority.value} value={priority.value}>
                        {priority.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_target_completion_date">Target Completion</Label>
                <Input
                  id="edit_target_completion_date"
                  type="date"
                  value={formData.target_completion_date}
                  onChange={(e) => setFormData({...formData, target_completion_date: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="edit_estimated_cost">Estimated Cost</Label>
                <Input
                  id="edit_estimated_cost"
                  type="number"
                  step="0.01"
                  value={formData.estimated_cost}
                  onChange={(e) => setFormData({...formData, estimated_cost: e.target.value})}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setEditingItem(null);
                resetForm();
              }}>
                Cancel
              </Button>
              <Button 
                onClick={handleUpdateItem}
                disabled={!formData.title || !formData.description}
              >
                Update Item
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

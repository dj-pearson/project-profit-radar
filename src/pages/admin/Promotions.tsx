import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ArrowLeft, Plus, Edit, Trash2, Tag, Calendar, Percent } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface Promotion {
  id: string;
  name: string;
  description?: string;
  discount_percentage: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  applies_to: string[];
  display_on: string[];
  created_at: string;
}

const Promotions = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    discount_percentage: '',
    start_date: '',
    end_date: '',
    is_active: true,
    applies_to: ['starter', 'professional', 'enterprise'],
    display_on: ['homepage', 'upgrade']
  });

  useEffect(() => {
    loadPromotions();
  }, []);

  const loadPromotions = async () => {
    try {
      const { data, error } = await supabase
        .from('promotions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPromotions(data || []);
    } catch (error: any) {
      console.error('Error loading promotions:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load promotions"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const promotionData = {
        name: formData.name,
        description: formData.description || null,
        discount_percentage: parseFloat(formData.discount_percentage),
        start_date: formData.start_date,
        end_date: formData.end_date,
        is_active: formData.is_active,
        applies_to: formData.applies_to,
        display_on: formData.display_on
      };

      let error;
      if (editingPromotion) {
        const { error: updateError } = await supabase
          .from('promotions')
          .update(promotionData)
          .eq('id', editingPromotion.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('promotions')
          .insert([promotionData]);
        error = insertError;
      }

      if (error) throw error;

      toast({
        title: "Success",
        description: `Promotion ${editingPromotion ? 'updated' : 'created'} successfully`
      });

      setIsDialogOpen(false);
      resetForm();
      loadPromotions();
    } catch (error: any) {
      console.error('Error saving promotion:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to save promotion"
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this promotion?')) return;

    try {
      const { error } = await supabase
        .from('promotions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Promotion deleted successfully"
      });

      loadPromotions();
    } catch (error: any) {
      console.error('Error deleting promotion:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete promotion"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      discount_percentage: '',
      start_date: '',
      end_date: '',
      is_active: true,
      applies_to: ['starter', 'professional', 'enterprise'],
      display_on: ['homepage', 'upgrade']
    });
    setEditingPromotion(null);
  };

  const openEditDialog = (promotion: Promotion) => {
    setEditingPromotion(promotion);
    setFormData({
      name: promotion.name,
      description: promotion.description || '',
      discount_percentage: promotion.discount_percentage.toString(),
      start_date: format(new Date(promotion.start_date), 'yyyy-MM-dd\'T\'HH:mm'),
      end_date: format(new Date(promotion.end_date), 'yyyy-MM-dd\'T\'HH:mm'),
      is_active: promotion.is_active,
      applies_to: promotion.applies_to,
      display_on: promotion.display_on
    });
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const isPromotionActive = (promotion: Promotion) => {
    if (!promotion.is_active) return false;
    const now = new Date();
    const start = new Date(promotion.start_date);
    const end = new Date(promotion.end_date);
    return now >= start && now <= end;
  };

  const handleTierChange = (tier: string, checked: boolean) => {
    if (checked) {
      setFormData(prev => ({
        ...prev,
        applies_to: [...prev.applies_to, tier]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        applies_to: prev.applies_to.filter(t => t !== tier)
      }));
    }
  };

  const handleDisplayChange = (location: string, checked: boolean) => {
    if (checked) {
      setFormData(prev => ({
        ...prev,
        display_on: [...prev.display_on, location]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        display_on: prev.display_on.filter(l => l !== location)
      }));
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
          <div className="flex items-center justify-between h-14 sm:h-16 lg:h-18">
            <div className="flex items-center space-x-2 sm:space-x-3 lg:space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/admin/settings')}
                className="flex-shrink-0"
              >
                <ArrowLeft className="h-4 w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Back to Settings</span>
                <span className="sm:hidden">Back</span>
              </Button>
              <div>
                <h1 className="text-base sm:text-lg lg:text-xl font-semibold text-foreground">
                  Promotion Management
                </h1>
                <p className="text-sm text-muted-foreground">
                  Create and manage discount campaigns
                </p>
              </div>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openCreateDialog}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Promotion
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingPromotion ? 'Edit Promotion' : 'Create New Promotion'}
                  </DialogTitle>
                  <DialogDescription>
                    Set up a promotional discount campaign for your pricing plans.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Campaign Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="e.g., 4th of July Sale"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="discount">Discount Percentage *</Label>
                      <Input
                        id="discount"
                        type="number"
                        min="1"
                        max="100"
                        step="0.01"
                        value={formData.discount_percentage}
                        onChange={(e) => setFormData(prev => ({ ...prev, discount_percentage: e.target.value }))}
                        placeholder="25"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Optional promotional message"
                      rows={2}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="start_date">Start Date & Time *</Label>
                      <Input
                        id="start_date"
                        type="datetime-local"
                        value={formData.start_date}
                        onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="end_date">End Date & Time *</Label>
                      <Input
                        id="end_date"
                        type="datetime-local"
                        value={formData.end_date}
                        onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label className="text-base font-medium">Applies to Plans</Label>
                      <div className="flex gap-4 mt-2">
                        {['starter', 'professional', 'enterprise'].map((tier) => (
                          <div key={tier} className="flex items-center space-x-2">
                            <Checkbox
                              id={tier}
                              checked={formData.applies_to.includes(tier)}
                              onCheckedChange={(checked) => handleTierChange(tier, checked as boolean)}
                            />
                            <Label htmlFor={tier} className="capitalize">{tier}</Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label className="text-base font-medium">Display Locations</Label>
                      <div className="flex gap-4 mt-2">
                        {[
                          { key: 'homepage', label: 'Homepage' },
                          { key: 'upgrade', label: 'Backend Upgrade Page' }
                        ].map((location) => (
                          <div key={location.key} className="flex items-center space-x-2">
                            <Checkbox
                              id={location.key}
                              checked={formData.display_on.includes(location.key)}
                              onCheckedChange={(checked) => handleDisplayChange(location.key, checked as boolean)}
                            />
                            <Label htmlFor={location.key}>{location.label}</Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="is_active"
                        checked={formData.is_active}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                      />
                      <Label htmlFor="is_active">Active</Label>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button type="submit" className="flex-1">
                      {editingPromotion ? 'Update Promotion' : 'Create Promotion'}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground mt-4">Loading promotions...</p>
          </div>
        ) : promotions.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Tag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No promotions yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first promotional campaign to offer discounts to customers.
              </p>
              <Button onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Promotion
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {promotions.map((promotion) => (
              <Card key={promotion.id} className={isPromotionActive(promotion) ? 'border-primary' : ''}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-xl">{promotion.name}</CardTitle>
                        <Badge variant={isPromotionActive(promotion) ? 'default' : 'secondary'}>
                          {isPromotionActive(promotion) ? 'Active' : 'Inactive'}
                        </Badge>
                        {!promotion.is_active && (
                          <Badge variant="outline">Disabled</Badge>
                        )}
                      </div>
                      {promotion.description && (
                        <p className="text-muted-foreground">{promotion.description}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEditDialog(promotion)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDelete(promotion.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center gap-2">
                      <Percent className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{promotion.discount_percentage}% Off</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        {format(new Date(promotion.start_date), 'MMM d, yyyy')} - {format(new Date(promotion.end_date), 'MMM d, yyyy')}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {promotion.applies_to.map((tier) => (
                        <Badge key={tier} variant="outline" className="text-xs capitalize">
                          {tier}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-1">
                    <span className="text-sm text-muted-foreground">Displays on:</span>
                    {promotion.display_on.map((location) => (
                      <Badge key={location} variant="secondary" className="text-xs">
                        {location === 'homepage' ? 'Homepage' : 'Backend Upgrade'}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Promotions;
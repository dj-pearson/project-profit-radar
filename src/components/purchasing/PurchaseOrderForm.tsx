import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { 
  Plus, 
  Trash2, 
  ArrowLeft,
  Save,
  Send
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface LineItem {
  line_number: number;
  description: string;
  quantity: number;
  unit_price: number;
  unit_of_measure: string;
  cost_code_id?: string;
  notes?: string;
}

interface Vendor {
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

const PurchaseOrderForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const isEditing = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [costCodes, setCostCodes] = useState<CostCode[]>([]);
  
  const [formData, setFormData] = useState({
    vendor_id: '',
    project_id: '',
    po_date: new Date().toISOString().split('T')[0],
    delivery_date: '',
    delivery_address: '',
    notes: '',
    terms: '',
    tax_rate: 0,
    shipping_cost: 0
  });

  const [lineItems, setLineItems] = useState<LineItem[]>([
    {
      line_number: 1,
      description: '',
      quantity: 1,
      unit_price: 0,
      unit_of_measure: 'each'
    }
  ]);

  useEffect(() => {
    loadFormData();
    if (isEditing) {
      loadPurchaseOrder();
    }
  }, [id, userProfile?.company_id]);

  const loadFormData = async () => {
    if (!userProfile?.company_id) return;

    try {
      const [vendorsRes, projectsRes, costCodesRes] = await Promise.all([
        supabase
          .from('vendors')
          .select('id, name')
          .eq('company_id', userProfile.company_id)
          .eq('is_active', true)
          .order('name'),
        supabase
          .from('projects')
          .select('id, name')
          .eq('company_id', userProfile.company_id)
          .order('name'),
        supabase
          .from('cost_codes')
          .select('id, code, name')
          .eq('company_id', userProfile.company_id)
          .eq('is_active', true)
          .order('code')
      ]);

      if (vendorsRes.error) throw vendorsRes.error;
      if (projectsRes.error) throw projectsRes.error;
      if (costCodesRes.error) throw costCodesRes.error;

      setVendors(vendorsRes.data || []);
      setProjects(projectsRes.data || []);
      setCostCodes(costCodesRes.data || []);
    } catch (error) {
      console.error('Error loading form data:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load form data"
      });
    }
  };

  const loadPurchaseOrder = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const { data: po, error: poError } = await supabase
        .from('purchase_orders')
        .select('*')
        .eq('id', id)
        .single();

      if (poError) throw poError;

      setFormData({
        vendor_id: po.vendor_id,
        project_id: po.project_id || '',
        po_date: po.po_date,
        delivery_date: po.delivery_date || '',
        delivery_address: po.delivery_address || '',
        notes: po.notes || '',
        terms: po.terms || '',
        tax_rate: po.tax_rate || 0,
        shipping_cost: po.shipping_cost || 0
      });

      const { data: items, error: itemsError } = await supabase
        .from('purchase_order_line_items')
        .select('*')
        .eq('purchase_order_id', id)
        .order('line_number');

      if (itemsError) throw itemsError;

      if (items && items.length > 0) {
        setLineItems(items.map(item => ({
          line_number: item.line_number,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          unit_of_measure: item.unit_of_measure,
          cost_code_id: item.cost_code_id,
          notes: item.notes
        })));
      }
    } catch (error) {
      console.error('Error loading purchase order:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load purchase order"
      });
    } finally {
      setLoading(false);
    }
  };

  const addLineItem = () => {
    setLineItems(prev => [...prev, {
      line_number: prev.length + 1,
      description: '',
      quantity: 1,
      unit_price: 0,
      unit_of_measure: 'each'
    }]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length <= 1) return;
    setLineItems(prev => prev.filter((_, i) => i !== index));
  };

  const updateLineItem = (index: number, field: keyof LineItem, value: any) => {
    setLineItems(prev => prev.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ));
  };

  const calculateTotals = () => {
    const subtotal = lineItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const taxAmount = subtotal * (formData.tax_rate / 100);
    const total = subtotal + taxAmount + formData.shipping_cost;
    
    return { subtotal, taxAmount, total };
  };

  const savePurchaseOrder = async (status: string = 'draft') => {
    if (!userProfile?.company_id || !formData.vendor_id) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please select a vendor"
      });
      return;
    }

    if (lineItems.some(item => !item.description || item.quantity <= 0)) {
      toast({
        variant: "destructive",
        title: "Invalid Line Items",
        description: "All line items must have a description and quantity greater than 0"
      });
      return;
    }

    try {
      setLoading(true);
      const { subtotal, taxAmount, total } = calculateTotals();

      const poData = {
        company_id: userProfile.company_id,
        vendor_id: formData.vendor_id,
        project_id: formData.project_id || null,
        po_number: '', // Will be auto-generated by trigger
        po_date: formData.po_date,
        delivery_date: formData.delivery_date || null,
        delivery_address: formData.delivery_address || null,
        notes: formData.notes || null,
        terms: formData.terms || null,
        subtotal,
        tax_rate: formData.tax_rate,
        tax_amount: taxAmount,
        shipping_cost: formData.shipping_cost,
        total_amount: total,
        status,
        created_by: userProfile.id
      };

      let poId: string;

      if (isEditing) {
        const { error } = await supabase
          .from('purchase_orders')
          .update(poData)
          .eq('id', id);
        if (error) throw error;
        poId = id!;

        // Delete existing line items
        const { error: deleteError } = await supabase
          .from('purchase_order_line_items')
          .delete()
          .eq('purchase_order_id', id);
        if (deleteError) throw deleteError;
      } else {
        const { data, error } = await supabase
          .from('purchase_orders')
          .insert(poData)
          .select()
          .single();
        if (error) throw error;
        poId = data.id;
      }

      // Insert line items
      const lineItemsData = lineItems.map((item, index) => ({
        purchase_order_id: poId,
        line_number: index + 1,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        unit_of_measure: item.unit_of_measure,
        cost_code_id: item.cost_code_id || null,
        notes: item.notes || null
      }));

      const { error: itemsError } = await supabase
        .from('purchase_order_line_items')
        .insert(lineItemsData);
      if (itemsError) throw itemsError;

      toast({
        title: isEditing ? "Purchase Order Updated" : "Purchase Order Created",
        description: `Purchase order ${status === 'sent' ? 'sent' : 'saved'} successfully`
      });

      navigate('/purchase-orders');
    } catch (error) {
      console.error('Error saving purchase order:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save purchase order"
      });
    } finally {
      setLoading(false);
    }
  };

  const { subtotal, taxAmount, total } = calculateTotals();

  if (loading && isEditing) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={() => navigate('/purchase-orders')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Purchase Orders
              </Button>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" onClick={() => savePurchaseOrder('draft')} disabled={loading}>
                <Save className="h-4 w-4 mr-2" />
                Save Draft
              </Button>
              <Button onClick={() => savePurchaseOrder('sent')} disabled={loading}>
                <Send className="h-4 w-4 mr-2" />
                Send to Vendor
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{isEditing ? 'Edit Purchase Order' : 'New Purchase Order'}</CardTitle>
              <CardDescription>
                Create a purchase order for vendor goods and services
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="vendor">Vendor *</Label>
                  <Select value={formData.vendor_id} onValueChange={(value) => 
                    setFormData(prev => ({ ...prev, vendor_id: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="Select vendor" />
                    </SelectTrigger>
                    <SelectContent>
                      {vendors.map(vendor => (
                        <SelectItem key={vendor.id} value={vendor.id}>
                          {vendor.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="project">Project (Optional)</Label>
                  <Select value={formData.project_id} onValueChange={(value) => 
                    setFormData(prev => ({ ...prev, project_id: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No Project</SelectItem>
                      {projects.map(project => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="po_date">PO Date</Label>
                  <Input
                    id="po_date"
                    type="date"
                    value={formData.po_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, po_date: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="delivery_date">Delivery Date</Label>
                  <Input
                    id="delivery_date"
                    type="date"
                    value={formData.delivery_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, delivery_date: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="delivery_address">Delivery Address</Label>
                <Textarea
                  id="delivery_address"
                  value={formData.delivery_address}
                  onChange={(e) => setFormData(prev => ({ ...prev, delivery_address: e.target.value }))}
                  placeholder="Delivery address (if different from company address)"
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Line Items</CardTitle>
                  <CardDescription>Add items to this purchase order</CardDescription>
                </div>
                <Button onClick={addLineItem} variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {lineItems.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-4 items-end p-4 border rounded-lg">
                    <div className="col-span-4">
                      <Label>Description *</Label>
                      <Input
                        value={item.description}
                        onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                        placeholder="Item description"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label>Quantity *</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.quantity}
                        onChange={(e) => updateLineItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="col-span-2">
                      <Label>Unit Price</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unit_price}
                        onChange={(e) => updateLineItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="col-span-2">
                      <Label>Unit</Label>
                      <Input
                        value={item.unit_of_measure}
                        onChange={(e) => updateLineItem(index, 'unit_of_measure', e.target.value)}
                        placeholder="each"
                      />
                    </div>
                    <div className="col-span-1">
                      <Label>Total</Label>
                      <div className="h-10 flex items-center font-medium">
                        ${(item.quantity * item.unit_price).toFixed(2)}
                      </div>
                    </div>
                    <div className="col-span-1">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => removeLineItem(index)}
                        disabled={lineItems.length <= 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Totals and Additional Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Additional Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="terms">Terms & Conditions</Label>
                  <Textarea
                    id="terms"
                    value={formData.terms}
                    onChange={(e) => setFormData(prev => ({ ...prev, terms: e.target.value }))}
                    placeholder="Payment terms, delivery requirements, etc."
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Additional notes for this purchase order"
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Purchase Order Total</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="tax_rate">Tax Rate (%):</Label>
                    <Input
                      id="tax_rate"
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={formData.tax_rate}
                      onChange={(e) => setFormData(prev => ({ ...prev, tax_rate: parseFloat(e.target.value) || 0 }))}
                      className="w-20"
                    />
                  </div>
                  <span>${taxAmount.toFixed(2)}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="shipping">Shipping:</Label>
                    <Input
                      id="shipping"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.shipping_cost}
                      onChange={(e) => setFormData(prev => ({ ...prev, shipping_cost: parseFloat(e.target.value) || 0 }))}
                      className="w-24"
                    />
                  </div>
                  <span>${formData.shipping_cost.toFixed(2)}</span>
                </div>
                
                <Separator />
                
                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PurchaseOrderForm;
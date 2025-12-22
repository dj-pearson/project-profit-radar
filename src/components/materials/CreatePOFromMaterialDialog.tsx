import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import {
  materialToPOService,
  MaterialData,
  PurchaseOrderData
} from '@/services/materialToPurchaseOrderService';
import {
  FileText,
  Package,
  DollarSign,
  Calendar,
  MapPin,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  Loader2,
  Building2
} from 'lucide-react';

interface CreatePOFromMaterialDialogProps {
  materialIds: string[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (poId: string) => void;
}

export const CreatePOFromMaterialDialog = ({
  materialIds,
  isOpen,
  onClose,
  onSuccess
}: CreatePOFromMaterialDialogProps) => {
  const { userProfile, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [materials, setMaterials] = useState<MaterialData[]>([]);
  const [totalCost, setTotalCost] = useState(0);
  const [canCreate, setCanCreate] = useState(false);
  const [issues, setIssues] = useState<string[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);

  // PO Form fields
  const [vendorId, setVendorId] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [deliveryLocation, setDeliveryLocation] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isOpen && materialIds.length > 0) {
      loadPreview();
      loadVendors();
    } else {
      resetForm();
    }
  }, [isOpen, materialIds]);

  const loadPreview = async () => {
    if (!siteId) return;

    setLoading(true);
    try {
      const preview = await materialToPOService.getPOPreview(siteId, materialIds);

      setMaterials(preview.materials || []);
      setTotalCost(preview.totalCost);
      setCanCreate(preview.canCreate);
      setIssues(preview.issues);

      // Pre-fill delivery location from first material's project
      if (preview.materials && preview.materials.length > 0) {
        const firstProject = preview.materials[0].project_name;
        if (firstProject) {
          setDeliveryLocation(`Project: ${firstProject}`);
        }
      }
    } catch (error) {
      console.error('Error loading preview:', error);
      toast({
        title: 'Error',
        description: 'Failed to load material details',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadVendors = async () => {
    if (!userProfile?.company_id || !siteId) return;

    try {
      const vendorList = await materialToPOService.getSuggestedVendors(
        siteId,  // CRITICAL: Site isolation
        userProfile.company_id
      );
      setVendors(vendorList);
    } catch (error) {
      console.error('Error loading vendors:', error);
    }
  };

  const handleCreate = async () => {
    if (!userProfile?.company_id || !user?.id || !siteId || !canCreate) return;

    // Validate vendor
    if (!vendorId && !vendorName.trim()) {
      toast({
        title: 'Vendor Required',
        description: 'Please select or enter a vendor name',
        variant: 'destructive'
      });
      return;
    }

    setCreating(true);
    try {
      const poData: PurchaseOrderData = {
        vendor_id: vendorId || undefined,
        vendor_name: vendorId ? '' : vendorName,
        project_id: materials[0]?.project_id,
        delivery_location: deliveryLocation,
        delivery_date: deliveryDate || undefined,
        notes
      };

      const result = await materialToPOService.createPOFromMaterials(
        siteId,  // CRITICAL: Site isolation
        materialIds,
        userProfile.company_id,
        user.id,
        poData
      );

      if (result.success && result.purchaseOrderId) {
        toast({
          title: 'Success!',
          description: (
            <div className="space-y-2">
              <p>Purchase order created successfully!</p>
              <p className="text-sm text-muted-foreground">
                {materials.length} material(s) added to PO
              </p>
            </div>
          )
        });

        onSuccess?.(result.purchaseOrderId);
        onClose();

        // Navigate to purchase orders page
        navigate('/purchase-orders');
      } else {
        toast({
          title: 'Creation Failed',
          description: result.error || 'Failed to create purchase order',
          variant: 'destructive'
        });
      }
    } catch (error: any) {
      console.error('PO creation error:', error);
      toast({
        title: 'Error',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive'
      });
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setMaterials([]);
    setTotalCost(0);
    setCanCreate(false);
    setIssues([]);
    setVendorId('');
    setVendorName('');
    setDeliveryLocation('');
    setDeliveryDate('');
    setNotes('');
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-construction-blue" />
            Create Purchase Order from Materials
          </DialogTitle>
          <DialogDescription>
            Generate a purchase order with automatic material quantities and pricing.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Issues/Warnings */}
            {issues.length > 0 && (
              <Alert variant={canCreate ? 'default' : 'destructive'}>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    {issues.map((issue, index) => (
                      <p key={index} className="text-sm">• {issue}</p>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Success Indicator */}
            {canCreate && materials.length > 0 && (
              <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800 dark:text-green-200">
                  Ready to create purchase order for {materials.length} material(s) totaling ${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </AlertDescription>
              </Alert>
            )}

            {/* Materials Summary */}
            {materials.length > 0 && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase mb-3">
                    Materials to Order
                  </h3>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          <th className="text-left p-2">Material</th>
                          <th className="text-right p-2">Qty</th>
                          <th className="text-right p-2">Unit Cost</th>
                          <th className="text-right p-2">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {materials.map((material) => {
                          const qty = material.quantity_needed || material.quantity_available || 0;
                          const total = qty * material.unit_cost;
                          return (
                            <tr key={material.id} className="border-t">
                              <td className="p-2">
                                <div>
                                  <p className="font-medium">{material.name}</p>
                                  {material.material_code && (
                                    <p className="text-xs text-muted-foreground">
                                      {material.material_code}
                                    </p>
                                  )}
                                </div>
                              </td>
                              <td className="text-right p-2">
                                {qty} {material.unit}
                              </td>
                              <td className="text-right p-2">
                                ${material.unit_cost.toFixed(2)}
                              </td>
                              <td className="text-right p-2 font-medium">
                                ${total.toFixed(2)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="bg-muted font-semibold">
                        <tr>
                          <td colSpan={3} className="text-right p-2">
                            Total Amount:
                          </td>
                          <td className="text-right p-2">
                            ${totalCost.toFixed(2)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                <Separator />

                {/* Conversion Arrow */}
                <div className="flex items-center justify-center py-2">
                  <ArrowRight className="h-6 w-6 text-construction-orange" />
                </div>

                {/* PO Configuration */}
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase mb-3">
                    Purchase Order Details
                  </h3>
                  <div className="space-y-4">
                    {/* Vendor Selection */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <Label htmlFor="vendor">
                          <Building2 className="h-3 w-3 inline mr-1" />
                          Vendor *
                        </Label>
                        {vendors.length > 0 ? (
                          <Select value={vendorId} onValueChange={(value) => {
                            setVendorId(value);
                            if (value) setVendorName('');
                          }}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select vendor or enter new below" />
                            </SelectTrigger>
                            <SelectContent>
                              {vendors.map((vendor) => (
                                <SelectItem key={vendor.id} value={vendor.id}>
                                  {vendor.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <p className="text-xs text-muted-foreground mt-1 mb-2">
                            No existing vendors. Enter new vendor name below.
                          </p>
                        )}
                      </div>

                      {!vendorId && (
                        <div className="col-span-2">
                          <Label htmlFor="vendor-name">New Vendor Name</Label>
                          <Input
                            id="vendor-name"
                            value={vendorName}
                            onChange={(e) => setVendorName(e.target.value)}
                            placeholder="Enter vendor name"
                          />
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="delivery-date">
                          <Calendar className="h-3 w-3 inline mr-1" />
                          Expected Delivery
                        </Label>
                        <Input
                          id="delivery-date"
                          type="date"
                          value={deliveryDate}
                          onChange={(e) => setDeliveryDate(e.target.value)}
                        />
                      </div>

                      <div>
                        <Label htmlFor="delivery-location">
                          <MapPin className="h-3 w-3 inline mr-1" />
                          Delivery Location
                        </Label>
                        <Input
                          id="delivery-location"
                          value={deliveryLocation}
                          onChange={(e) => setDeliveryLocation(e.target.value)}
                          placeholder="Jobsite or warehouse"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="notes">Notes / Special Instructions</Label>
                      <Textarea
                        id="notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Delivery instructions, payment terms, etc."
                        rows={3}
                      />
                    </div>
                  </div>
                </div>

                {/* What will happen */}
                <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200">
                  <CheckCircle className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800 dark:text-blue-200">
                    <p className="font-semibold mb-2">What will be created:</p>
                    <ul className="text-sm space-y-1 ml-4">
                      <li>✓ Draft purchase order with PO number</li>
                      <li>✓ {materials.length} line item(s) with quantities and pricing</li>
                      <li>✓ Total amount: ${totalCost.toFixed(2)}</li>
                      <li>✓ Materials linked to PO for tracking</li>
                      <li>✓ Vendor created if new</li>
                    </ul>
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={creating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!canCreate || creating || (!vendorId && !vendorName.trim())}
          >
            {creating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <FileText className="mr-2 h-4 w-4" />
                Create Purchase Order
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

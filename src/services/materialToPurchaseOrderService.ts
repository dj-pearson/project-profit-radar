/**
 * Material to Purchase Order Service
 */
import { supabase } from '@/integrations/supabase/client';

export interface MaterialData {
  id: string;
  name: string;
  material_code?: string;
  category?: string;
  unit: string;
  quantity_available?: number;
  quantity_needed?: number;
  unit_cost: number;
  project_id?: string;
  project_name?: string;
}

export interface PurchaseOrderData {
  vendor_id?: string;
  vendor_name: string;
  project_id?: string;
  delivery_location?: string;
  delivery_date?: string;
  notes?: string;
}

export interface POCreationResult {
  success: boolean;
  purchaseOrderId?: string;
  error?: string;
}

class MaterialToPurchaseOrderService {
  /**
   * Creates a purchase order from material request(s)
   */
  async createPOFromMaterials(
    materialIds: string[],
    companyId: string,
    userId: string,
    poData: PurchaseOrderData
  ): Promise<POCreationResult> {
    try {
      // 1. Fetch materials
      const { data: materials, error: materialsError } = await supabase
        .from('materials')
        .select('*')
        .in('id', materialIds);

      if (materialsError || !materials || materials.length === 0) {
        return {
          success: false,
          error: 'Failed to fetch material details'
        };
      }

      // 2. Calculate total amount
      const totalAmount = materials.reduce((sum, mat) => {
        const quantity = mat.quantity_needed || mat.quantity_available || 0;
        return sum + (quantity * mat.unit_cost);
      }, 0);

      // 3. Get or create vendor
      let vendorId = poData.vendor_id;
      if (!vendorId && poData.vendor_name) {
        // Check if vendor exists
        const { data: existingVendor } = await supabase
          .from('vendors')
          .select('id')
          .eq('name', poData.vendor_name)
          .eq('company_id', companyId)
          .single();

        if (existingVendor) {
          vendorId = existingVendor.id;
        } else {
          // Create new vendor
          const { data: newVendor, error: vendorError } = await supabase
            .from('vendors')
            .insert({
              company_id: companyId,
              name: poData.vendor_name,
              vendor_type: 'supplier',
              status: 'active'
            })
            .select()
            .single();

          if (vendorError) {
            console.error('Vendor creation error:', vendorError);
            return {
              success: false,
              error: 'Failed to create vendor'
            };
          }

          vendorId = newVendor.id;
        }
      }

      if (!vendorId) {
        return {
          success: false,
          error: 'Vendor is required'
        };
      }

      // 4. Create purchase order
      const { data: newPO, error: poError } = await supabase
        .from('purchase_orders')
        .insert({
          company_id: companyId,
          vendor_id: vendorId,
          project_id: poData.project_id || materials[0].project_id || null,
          po_date: new Date().toISOString().split('T')[0],
          delivery_date: poData.delivery_date || null,
          delivery_location: poData.delivery_location || null,
          total_amount: totalAmount,
          status: 'draft',
          notes: poData.notes || '',
          created_by: userId
        })
        .select()
        .single();

      if (poError || !newPO) {
        console.error('PO creation error:', poError);
        return {
          success: false,
          error: 'Failed to create purchase order'
        };
      }

      // 5. Create PO line items from materials
      const lineItems = materials.map((material) => ({
        purchase_order_id: newPO.id,
        material_id: material.id,
        description: material.name,
        quantity: material.quantity_needed || material.quantity_available || 0,
        unit: material.unit,
        unit_price: material.unit_cost,
        total_price: (material.quantity_needed || material.quantity_available || 0) * material.unit_cost,
        category: material.category || 'General'
      }));

      if (lineItems.length > 0) {
        const { error: lineItemsError } = await supabase
          .from('purchase_order_items')
          .insert(lineItems);

        if (lineItemsError) {
          console.error('Failed to create PO line items:', lineItemsError);
          // Continue anyway - PO is created
        }
      }

      // 6. Update materials to link to PO
      const { error: updateError } = await supabase
        .from('materials')
        .update({ purchase_order_id: newPO.id })
        .in('id', materialIds);

      if (updateError) {
        console.error('Failed to link materials to PO:', updateError);
        // Continue anyway
      }

      return {
        success: true,
        purchaseOrderId: newPO.id
      };

    } catch (error: any) {
      console.error('Material to PO conversion error:', error);
      return {
        success: false,
        error: error.message || 'An unexpected error occurred'
      };
    }
  }

  /**
   * Gets preview data for PO creation
   */
  async getPOPreview(materialIds: string[]): Promise<{
    materials: MaterialData[] | null;
    totalCost: number;
    canCreate: boolean;
    issues: string[];
  }> {
    try {
      const { data: materials, error } = await supabase
        .from('materials')
        .select(`
          *,
          projects(name)
        `)
        .in('id', materialIds);

      if (error || !materials || materials.length === 0) {
        return {
          materials: null,
          totalCost: 0,
          canCreate: false,
          issues: ['Materials not found']
        };
      }

      const issues: string[] = [];

      // Check if already on PO
      const alreadyOnPO = materials.filter(m => m.purchase_order_id);
      if (alreadyOnPO.length > 0) {
        issues.push(`${alreadyOnPO.length} material(s) already on a purchase order`);
      }

      // Check required fields
      const missingCost = materials.filter(m => !m.unit_cost || m.unit_cost <= 0);
      if (missingCost.length > 0) {
        issues.push(`${missingCost.length} material(s) missing unit cost`);
      }

      const missingQuantity = materials.filter(m =>
        (!m.quantity_needed || m.quantity_needed <= 0) &&
        (!m.quantity_available || m.quantity_available <= 0)
      );
      if (missingQuantity.length > 0) {
        issues.push(`${missingQuantity.length} material(s) missing quantity`);
      }

      // Calculate total
      const totalCost = materials.reduce((sum, mat) => {
        const quantity = mat.quantity_needed || mat.quantity_available || 0;
        return sum + (quantity * (mat.unit_cost || 0));
      }, 0);

      const formattedMaterials = materials.map(m => ({
        id: m.id,
        name: m.name,
        material_code: m.material_code,
        category: m.category,
        unit: m.unit,
        quantity_available: m.quantity_available,
        quantity_needed: m.quantity_needed,
        unit_cost: m.unit_cost,
        project_id: m.project_id,
        project_name: m.projects?.name
      }));

      return {
        materials: formattedMaterials,
        totalCost,
        canCreate: issues.length === 0,
        issues
      };

    } catch (error) {
      console.error('Error getting PO preview:', error);
      return {
        materials: null,
        totalCost: 0,
        canCreate: false,
        issues: ['Failed to load material data']
      };
    }
  }

  /**
   * Gets suggested vendors for materials
   */
  async getSuggestedVendors(companyId: string, category?: string): Promise<any[]> {
    try {
      let query = supabase
        .from('vendors')
        .select('id, name, email, phone')
        .eq('company_id', companyId)
        .eq('status', 'active')
        .order('name');

      // Could filter by category/specialty if that data exists
      const { data, error } = await query;

      if (error) {
        console.error('Error fetching vendors:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting suggested vendors:', error);
      return [];
    }
  }
}

export const materialToPOService = new MaterialToPurchaseOrderService();

import { supabase } from "@/integrations/supabase/client";

export interface MaterialDeliveryPlan {
  material_id: string;
  quantity_needed: number;
  optimal_delivery_date: Date;
  storage_location: string;
  delivery_window: TimeWindow;
  supplier_id: string;
  cost_optimization: CostSavings;
  delivery_priority: "low" | "medium" | "high" | "critical";
}

export interface TimeWindow {
  start_time: string;
  end_time: string;
  preferred_date: Date;
  alternative_dates: Date[];
}

export interface CostSavings {
  bulk_discount: number;
  early_payment_discount: number;
  combined_delivery_savings: number;
  total_savings: number;
}

export interface MaterialShortage {
  material_id: string;
  material_name: string;
  required_quantity: number;
  available_quantity: number;
  shortage_amount: number;
  needed_by_date: Date;
  affected_tasks: string[];
  suggested_suppliers: SupplierOption[];
  urgency_level: "low" | "medium" | "high" | "critical";
}

export interface SupplierOption {
  supplier_id: string;
  supplier_name: string;
  availability: boolean;
  estimated_delivery_days: number;
  unit_price: number;
  minimum_order_quantity: number;
  reliability_score: number;
}

export interface InventoryOptimization {
  total_value_optimized: number;
  cross_project_transfers: CrossProjectTransfer[];
  excess_materials: ExcessMaterial[];
  consolidation_opportunities: ConsolidationOpportunity[];
  waste_reduction_potential: number;
}

export interface CrossProjectTransfer {
  from_project_id: string;
  to_project_id: string;
  material_id: string;
  quantity: number;
  transfer_cost: number;
  estimated_savings: number;
  transfer_date: Date;
}

export interface ExcessMaterial {
  material_id: string;
  material_name: string;
  project_id: string;
  excess_quantity: number;
  estimated_value: number;
  expiry_date?: Date;
  reallocation_options: string[];
}

export interface ConsolidationOpportunity {
  material_type: string;
  projects_involved: string[];
  combined_quantity: number;
  individual_orders_cost: number;
  consolidated_cost: number;
  savings_amount: number;
  optimal_delivery_date: Date;
}

export interface PurchaseOrder {
  po_id: string;
  supplier_id: string;
  project_id: string;
  materials: PurchaseOrderItem[];
  total_amount: number;
  delivery_date: Date;
  status: "draft" | "pending" | "approved" | "ordered" | "delivered";
  auto_generated: boolean;
}

export interface PurchaseOrderItem {
  material_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface MaterialUsagePrediction {
  material_id: string;
  predicted_usage: number;
  confidence_level: number;
  usage_pattern: "steady" | "increasing" | "decreasing" | "seasonal";
  recommended_stock_level: number;
  reorder_point: number;
}

class MaterialOrchestrationService {
  /**
   * Calculate optimal delivery timing for all project materials
   */
  async calculateOptimalDeliveryTiming(project_id: string): Promise<MaterialDeliveryPlan[]> {
    try {
      // Get project tasks with material requirements
      const { data: tasks, error: tasksError } = await supabase
        .from("tasks")
        .select(`
          *,
          material_usage(
            material_id,
            quantity_needed,
            materials(*)
          )
        `)
        .eq("project_id", project_id)
        .order("start_date");

      if (tasksError) throw tasksError;

      const deliveryPlans: MaterialDeliveryPlan[] = [];

      for (const task of tasks || []) {
        if (!task.material_usage || task.material_usage.length === 0) continue;

        for (const usage of task.material_usage) {
          const material = usage.materials;
          if (!material) continue;

          // Calculate optimal delivery date (just-in-time)
          const taskStartDate = new Date(task.start_date);
          const optimalDeliveryDate = new Date(taskStartDate);
          
          // Account for material lead time
          const leadTimeDays = await this.getMaterialLeadTime(usage.material_id);
          optimalDeliveryDate.setDate(optimalDeliveryDate.getDate() - leadTimeDays);

          // Account for storage constraints
          const storageLocation = await this.getOptimalStorageLocation(
            project_id, 
            usage.material_id,
            usage.quantity_needed
          );

          // Calculate cost optimization
          const costOptimization = await this.calculateCostOptimization(
            usage.material_id,
            usage.quantity_needed,
            optimalDeliveryDate
          );

          // Get best supplier
          const supplier = await this.getBestSupplier(usage.material_id, usage.quantity_needed);

          deliveryPlans.push({
            material_id: usage.material_id,
            quantity_needed: usage.quantity_needed,
            optimal_delivery_date: optimalDeliveryDate,
            storage_location: storageLocation,
            delivery_window: {
              start_time: "08:00",
              end_time: "16:00",
              preferred_date: optimalDeliveryDate,
              alternative_dates: this.generateAlternativeDates(optimalDeliveryDate)
            },
            supplier_id: supplier.supplier_id,
            cost_optimization: costOptimization,
            delivery_priority: this.calculateDeliveryPriority(task, usage)
          });
        }
      }

      return deliveryPlans;
    } catch (error) {
      console.error("Error calculating optimal delivery timing:", error);
      throw error;
    }
  }

  /**
   * Detect material shortages ahead of time
   */
  async detectMaterialShortages(project_id: string, days_ahead: number = 14): Promise<MaterialShortage[]> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() + days_ahead);

      // Get upcoming material requirements
      const { data: upcomingRequirements, error } = await supabase
        .from("tasks")
        .select(`
          *,
          material_usage(
            material_id,
            quantity_needed,
            materials(name, unit)
          )
        `)
        .eq("project_id", project_id)
        .lte("start_date", cutoffDate.toISOString())
        .neq("status", "completed");

      if (error) throw error;

      const shortages: MaterialShortage[] = [];
      const materialRequirements = new Map();

      // Aggregate material requirements
      for (const task of upcomingRequirements || []) {
        if (!task.material_usage) continue;

        for (const usage of task.material_usage) {
          const materialId = usage.material_id;
          if (!materialRequirements.has(materialId)) {
            materialRequirements.set(materialId, {
              material_name: usage.materials.name,
              total_required: 0,
              tasks: [],
              earliest_needed: new Date(task.start_date)
            });
          }

          const existing = materialRequirements.get(materialId);
          existing.total_required += usage.quantity_needed;
          existing.tasks.push(task.id);
          
          if (new Date(task.start_date) < existing.earliest_needed) {
            existing.earliest_needed = new Date(task.start_date);
          }
        }
      }

      // Check availability for each material
      for (const [materialId, requirement] of materialRequirements) {
        const availableQuantity = await this.getAvailableQuantity(project_id, materialId);
        
        if (availableQuantity < requirement.total_required) {
          const shortageAmount = requirement.total_required - availableQuantity;
          const suppliers = await this.findSuppliersForMaterial(materialId);

          shortages.push({
            material_id: materialId,
            material_name: requirement.material_name,
            required_quantity: requirement.total_required,
            available_quantity: availableQuantity,
            shortage_amount: shortageAmount,
            needed_by_date: requirement.earliest_needed,
            affected_tasks: requirement.tasks,
            suggested_suppliers: suppliers,
            urgency_level: this.calculateUrgencyLevel(requirement.earliest_needed, shortageAmount)
          });
        }
      }

      return shortages;
    } catch (error) {
      console.error("Error detecting material shortages:", error);
      throw error;
    }
  }

  /**
   * Optimize inventory across multiple projects
   */
  async optimizeCrossProjectInventory(company_id: string): Promise<InventoryOptimization> {
    try {
      // Get all company projects with material inventory
      const { data: projects, error } = await supabase
        .from("projects")
        .select(`
          id,
          name,
          status,
          material_usage(
            material_id,
            quantity_needed,
            quantity_used,
            materials(name, unit, unit_cost)
          )
        `)
        .eq("company_id", company_id)
        .in("status", ["active", "on_hold"]);

      if (error) throw error;

      const transfers: CrossProjectTransfer[] = [];
      const excessMaterials: ExcessMaterial[] = [];
      const consolidationOpportunities: ConsolidationOpportunity[] = [];

      // Analyze each project's material situation
      const projectMaterials = new Map();
      
      for (const project of projects || []) {
        const materialSummary = new Map();
        
        for (const usage of project.material_usage || []) {
          const materialId = usage.material_id;
          const excess = (usage.quantity_used || 0) - usage.quantity_needed;
          
          if (!materialSummary.has(materialId)) {
            materialSummary.set(materialId, {
              material: usage.materials,
              total_needed: 0,
              total_available: 0,
              excess: 0
            });
          }
          
          const summary = materialSummary.get(materialId);
          summary.total_needed += usage.quantity_needed;
          summary.total_available += (usage.quantity_used || 0);
          summary.excess = summary.total_available - summary.total_needed;
        }
        
        projectMaterials.set(project.id, {
          project_name: project.name,
          materials: materialSummary
        });
      }

      // Find transfer opportunities
      for (const [fromProjectId, fromProject] of projectMaterials) {
        for (const [materialId, fromMaterial] of fromProject.materials) {
          if (fromMaterial.excess <= 0) continue;

          // Look for projects that need this material
          for (const [toProjectId, toProject] of projectMaterials) {
            if (fromProjectId === toProjectId) continue;
            
            const toMaterial = toProject.materials.get(materialId);
            if (!toMaterial || toMaterial.excess >= 0) continue;

            const transferQuantity = Math.min(fromMaterial.excess, Math.abs(toMaterial.excess));
            const transferCost = this.calculateTransferCost(transferQuantity, fromMaterial.material);
            const savings = (transferQuantity * fromMaterial.material.unit_cost) - transferCost;

            if (savings > 0) {
              transfers.push({
                from_project_id: fromProjectId,
                to_project_id: toProjectId,
                material_id: materialId,
                quantity: transferQuantity,
                transfer_cost: transferCost,
                estimated_savings: savings,
                transfer_date: new Date()
              });
            }
          }

          // If still excess after transfers, mark as excess
          if (fromMaterial.excess > 0) {
            excessMaterials.push({
              material_id: materialId,
              material_name: fromMaterial.material.name,
              project_id: fromProjectId,
              excess_quantity: fromMaterial.excess,
              estimated_value: fromMaterial.excess * fromMaterial.material.unit_cost,
              reallocation_options: ["sell", "store", "donate"]
            });
          }
        }
      }

      // Find consolidation opportunities
      const materialDemand = new Map();
      for (const [projectId, project] of projectMaterials) {
        for (const [materialId, material] of project.materials) {
          if (material.total_needed <= 0) continue;
          
          if (!materialDemand.has(materialId)) {
            materialDemand.set(materialId, {
              material: material.material,
              projects: [],
              total_quantity: 0
            });
          }
          
          const demand = materialDemand.get(materialId);
          demand.projects.push(projectId);
          demand.total_quantity += material.total_needed;
        }
      }

      for (const [materialId, demand] of materialDemand) {
        if (demand.projects.length < 2) continue;

        const individualCost = demand.total_quantity * demand.material.unit_cost;
        const bulkDiscount = this.calculateBulkDiscount(demand.total_quantity);
        const consolidatedCost = individualCost * (1 - bulkDiscount);
        const savings = individualCost - consolidatedCost;

        if (savings > 100) { // Minimum $100 savings threshold
          consolidationOpportunities.push({
            material_type: demand.material.name,
            projects_involved: demand.projects,
            combined_quantity: demand.total_quantity,
            individual_orders_cost: individualCost,
            consolidated_cost: consolidatedCost,
            savings_amount: savings,
            optimal_delivery_date: new Date()
          });
        }
      }

      const totalValueOptimized = 
        transfers.reduce((sum, t) => sum + t.estimated_savings, 0) +
        consolidationOpportunities.reduce((sum, c) => sum + c.savings_amount, 0);

      return {
        total_value_optimized: totalValueOptimized,
        cross_project_transfers: transfers,
        excess_materials: excessMaterials,
        consolidation_opportunities: consolidationOpportunities,
        waste_reduction_potential: excessMaterials.reduce((sum, e) => sum + e.estimated_value, 0)
      };
    } catch (error) {
      console.error("Error optimizing cross-project inventory:", error);
      throw error;
    }
  }

  /**
   * Automatically generate purchase orders
   */
  async autoGeneratePurchaseOrders(project_id?: string): Promise<PurchaseOrder[]> {
    try {
      // Get material shortages
      const shortages = project_id 
        ? await this.detectMaterialShortages(project_id)
        : await this.getAllCompanyShortages();

      const purchaseOrders: PurchaseOrder[] = [];
      const supplierOrders = new Map();

      // Group materials by supplier for efficiency
      for (const shortage of shortages) {
        const bestSupplier = shortage.suggested_suppliers[0];
        if (!bestSupplier) continue;

        if (!supplierOrders.has(bestSupplier.supplier_id)) {
          supplierOrders.set(bestSupplier.supplier_id, {
            supplier: bestSupplier,
            materials: [],
            total_amount: 0
          });
        }

        const order = supplierOrders.get(bestSupplier.supplier_id);
        const itemTotal = shortage.shortage_amount * bestSupplier.unit_price;
        
        order.materials.push({
          material_id: shortage.material_id,
          quantity: shortage.shortage_amount,
          unit_price: bestSupplier.unit_price,
          total_price: itemTotal
        });
        
        order.total_amount += itemTotal;
      }

      // Create purchase orders
      for (const [supplierId, orderData] of supplierOrders) {
        const deliveryDate = new Date();
        deliveryDate.setDate(deliveryDate.getDate() + orderData.supplier.estimated_delivery_days);

        purchaseOrders.push({
          po_id: crypto.randomUUID(),
          supplier_id: supplierId,
          project_id: project_id || "",
          materials: orderData.materials,
          total_amount: orderData.total_amount,
          delivery_date: deliveryDate,
          status: "draft",
          auto_generated: true
        });
      }

      return purchaseOrders;
    } catch (error) {
      console.error("Error generating purchase orders:", error);
      throw error;
    }
  }

  /**
   * Predict material usage patterns
   */
  async predictMaterialUsage(material_id: string, project_id?: string): Promise<MaterialUsagePrediction> {
    try {
      // Get historical usage data
      const { data: historicalUsage, error } = await supabase
        .from("material_usage")
        .select("quantity_needed, quantity_used, created_at")
        .eq("material_id", material_id)
        .eq(project_id ? "project_id" : "material_id", project_id || material_id)
        .order("created_at");

      if (error) throw error;

      if (!historicalUsage || historicalUsage.length < 3) {
        // Not enough data for prediction
        return {
          material_id,
          predicted_usage: 0,
          confidence_level: 0.1,
          usage_pattern: "steady",
          recommended_stock_level: 0,
          reorder_point: 0
        };
      }

      // Simple trend analysis
      const usageAmounts = historicalUsage.map(u => u.quantity_used || u.quantity_needed);
      const avgUsage = usageAmounts.reduce((sum, amt) => sum + amt, 0) / usageAmounts.length;
      
      // Calculate trend
      let trend = 0;
      for (let i = 1; i < usageAmounts.length; i++) {
        trend += usageAmounts[i] - usageAmounts[i - 1];
      }
      trend = trend / (usageAmounts.length - 1);

      // Determine pattern
      let pattern: "steady" | "increasing" | "decreasing" | "seasonal" = "steady";
      if (Math.abs(trend) > avgUsage * 0.1) {
        pattern = trend > 0 ? "increasing" : "decreasing";
      }

      // Calculate predictions
      const predictedUsage = Math.max(0, avgUsage + trend);
      const confidenceLevel = Math.min(0.9, usageAmounts.length / 10); // More data = higher confidence
      const recommendedStockLevel = predictedUsage * 1.2; // 20% buffer
      const reorderPoint = predictedUsage * 0.3; // Reorder at 30% of predicted usage

      return {
        material_id,
        predicted_usage: predictedUsage,
        confidence_level: confidenceLevel,
        usage_pattern: pattern,
        recommended_stock_level: recommendedStockLevel,
        reorder_point: reorderPoint
      };
    } catch (error) {
      console.error("Error predicting material usage:", error);
      throw error;
    }
  }

  /**
   * Private helper methods
   */
  private async getMaterialLeadTime(material_id: string): Promise<number> {
    // Get supplier lead time from material_suppliers table
    const { data } = await supabase
      .from("material_suppliers")
      .select("lead_time_days")
      .eq("material_id", material_id)
      .order("lead_time_days")
      .limit(1);

    return data?.[0]?.lead_time_days || 3; // Default 3 days
  }

  private async getOptimalStorageLocation(
    project_id: string, 
    material_id: string, 
    quantity: number
  ): Promise<string> {
    // Simple storage logic - could be enhanced with actual storage capacity tracking
    const { data: material } = await supabase
      .from("materials")
      .select("storage_requirements")
      .eq("id", material_id)
      .single();

    const storageReqs = material?.storage_requirements;
    
    if (storageReqs?.includes("covered")) {
      return "covered_storage";
    } else if (storageReqs?.includes("dry")) {
      return "dry_storage";
    } else {
      return "general_storage";
    }
  }

  private async calculateCostOptimization(
    material_id: string,
    quantity: number,
    delivery_date: Date
  ): Promise<CostSavings> {
    // Calculate various cost optimizations
    const bulkDiscount = this.calculateBulkDiscount(quantity);
    const earlyPaymentDiscount = 0.02; // 2% for early payment
    const combinedDeliveryDiscount = 0.01; // 1% for combined deliveries
    
    const baseAmount = quantity * 100; // Placeholder base cost
    const bulkSavings = baseAmount * bulkDiscount;
    const earlyPaymentSavings = baseAmount * earlyPaymentDiscount;
    const combinedDeliverySavings = baseAmount * combinedDeliveryDiscount;

    return {
      bulk_discount: bulkSavings,
      early_payment_discount: earlyPaymentSavings,
      combined_delivery_savings: combinedDeliverySavings,
      total_savings: bulkSavings + earlyPaymentSavings + combinedDeliverySavings
    };
  }

  private calculateBulkDiscount(quantity: number): number {
    if (quantity >= 1000) return 0.10; // 10% for large orders
    if (quantity >= 500) return 0.05;  // 5% for medium orders
    if (quantity >= 100) return 0.02;  // 2% for small bulk orders
    return 0;
  }

  private async getBestSupplier(material_id: string, quantity: number): Promise<SupplierOption> {
    const { data: suppliers } = await supabase
      .from("material_suppliers")
      .select(`
        supplier_id,
        unit_price,
        lead_time_days,
        minimum_order_quantity,
        suppliers(name, reliability_score)
      `)
      .eq("material_id", material_id)
      .gte("minimum_order_quantity", quantity)
      .order("unit_price");

    if (!suppliers || suppliers.length === 0) {
      return {
        supplier_id: "default",
        supplier_name: "Default Supplier",
        availability: true,
        estimated_delivery_days: 7,
        unit_price: 100,
        minimum_order_quantity: 1,
        reliability_score: 0.7
      };
    }

    const best = suppliers[0];
    return {
      supplier_id: best.supplier_id,
      supplier_name: best.suppliers.name,
      availability: true,
      estimated_delivery_days: best.lead_time_days,
      unit_price: best.unit_price,
      minimum_order_quantity: best.minimum_order_quantity,
      reliability_score: best.suppliers.reliability_score
    };
  }

  private calculateDeliveryPriority(task: any, usage: any): "low" | "medium" | "high" | "critical" {
    const taskStartDate = new Date(task.start_date);
    const daysUntilNeeded = Math.ceil((taskStartDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilNeeded <= 3) return "critical";
    if (daysUntilNeeded <= 7) return "high";
    if (daysUntilNeeded <= 14) return "medium";
    return "low";
  }

  private generateAlternativeDates(preferredDate: Date): Date[] {
    const alternatives = [];
    for (let i = 1; i <= 3; i++) {
      const altDate = new Date(preferredDate);
      altDate.setDate(altDate.getDate() + i);
      alternatives.push(altDate);
    }
    return alternatives;
  }

  private async getAvailableQuantity(project_id: string, material_id: string): Promise<number> {
    const { data } = await supabase
      .from("material_usage")
      .select("quantity_used")
      .eq("project_id", project_id)
      .eq("material_id", material_id);

    return data?.reduce((sum, item) => sum + (item.quantity_used || 0), 0) || 0;
  }

  private async findSuppliersForMaterial(material_id: string): Promise<SupplierOption[]> {
    const { data: suppliers } = await supabase
      .from("material_suppliers")
      .select(`
        supplier_id,
        unit_price,
        lead_time_days,
        minimum_order_quantity,
        suppliers(name, reliability_score)
      `)
      .eq("material_id", material_id)
      .order("unit_price")
      .limit(5);

    return (suppliers || []).map(s => ({
      supplier_id: s.supplier_id,
      supplier_name: s.suppliers.name,
      availability: true,
      estimated_delivery_days: s.lead_time_days,
      unit_price: s.unit_price,
      minimum_order_quantity: s.minimum_order_quantity,
      reliability_score: s.suppliers.reliability_score
    }));
  }

  private calculateUrgencyLevel(neededByDate: Date, shortageAmount: number): "low" | "medium" | "high" | "critical" {
    const daysUntilNeeded = Math.ceil((neededByDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilNeeded <= 2) return "critical";
    if (daysUntilNeeded <= 5) return "high";
    if (daysUntilNeeded <= 10) return "medium";
    return "low";
  }

  private calculateTransferCost(quantity: number, material: any): number {
    // Simple transfer cost calculation
    const baseCost = 50; // Base transport cost
    const perUnitCost = material.unit_cost * 0.05; // 5% of unit cost for handling
    return baseCost + (quantity * perUnitCost);
  }

  private async getAllCompanyShortages(): Promise<MaterialShortage[]> {
    // Placeholder - would need to implement company-wide shortage detection
    return [];
  }
}

export const materialOrchestrationService = new MaterialOrchestrationService();

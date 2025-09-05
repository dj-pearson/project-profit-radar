import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Calendar,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Package,
  DollarSign,
  ArrowRightLeft,
  Truck,
  BarChart3,
  FileText,
  Settings,
} from "lucide-react";
import {
  materialOrchestrationService,
  MaterialShortage,
  MaterialDeliveryPlan,
  InventoryOptimization,
  PurchaseOrder,
  MaterialUsagePrediction,
} from "@/services/MaterialOrchestrationService";
import { toast } from "sonner";

interface MaterialOrchestrationDashboardProps {
  projectId?: string;
  companyId?: string;
}

export default function MaterialOrchestrationDashboard({
  projectId,
  companyId,
}: MaterialOrchestrationDashboardProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(false);

  // State for different data types
  const [deliveryPlans, setDeliveryPlans] = useState<MaterialDeliveryPlan[]>(
    []
  );
  const [shortages, setShortages] = useState<MaterialShortage[]>([]);
  const [inventoryOptimization, setInventoryOptimization] =
    useState<InventoryOptimization | null>(null);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [predictions, setPredictions] = useState<MaterialUsagePrediction[]>([]);

  useEffect(() => {
    if (projectId || companyId) {
      loadDashboardData();
    }
  }, [projectId, companyId]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const promises = [];

      if (projectId) {
        promises.push(
          materialOrchestrationService.calculateOptimalDeliveryTiming(
            projectId
          ),
          materialOrchestrationService.detectMaterialShortages(projectId),
          materialOrchestrationService.autoGeneratePurchaseOrders(projectId)
        );
      }

      if (companyId) {
        promises.push(
          materialOrchestrationService.optimizeCrossProjectInventory(companyId)
        );
      }

      const results = await Promise.allSettled(promises);

      let resultIndex = 0;
      if (projectId) {
        if (results[resultIndex].status === "fulfilled") {
          setDeliveryPlans(
            (results[resultIndex] as PromiseFulfilledResult<any>).value as MaterialDeliveryPlan[]
          );
        }
        resultIndex++;

        if (results[resultIndex].status === "fulfilled") {
          setShortages((results[resultIndex] as PromiseFulfilledResult<any>).value as MaterialShortage[]);
        }
        resultIndex++;

        if (results[resultIndex].status === "fulfilled") {
          setPurchaseOrders((results[resultIndex] as PromiseFulfilledResult<any>).value as PurchaseOrder[]);
        }
        resultIndex++;
      }

      if (companyId && results[resultIndex]?.status === "fulfilled") {
        setInventoryOptimization(
          (results[resultIndex] as PromiseFulfilledResult<any>).value as InventoryOptimization
        );
      }
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      toast.error("Failed to load material orchestration data");
    } finally {
      setLoading(false);
    }
  };

  const handleAutoGeneratePO = async () => {
    if (!projectId) return;

    setLoading(true);
    try {
      const newPOs =
        await materialOrchestrationService.autoGeneratePurchaseOrders(
          projectId
        );
      setPurchaseOrders((prev) => [...prev, ...newPOs]);
      toast.success(`Generated ${newPOs.length} purchase orders`);
    } catch (error) {
      toast.error("Failed to generate purchase orders");
    } finally {
      setLoading(false);
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "critical":
        return "destructive";
      case "high":
        return "destructive";
      case "medium":
        return "secondary";
      case "low":
        return "outline";
      default:
        return "outline";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical":
        return "destructive";
      case "high":
        return "destructive";
      case "medium":
        return "secondary";
      case "low":
        return "outline";
      default:
        return "outline";
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(date));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Material Orchestration
          </h2>
          <p className="text-muted-foreground">
            Smart material planning, shortage detection, and inventory
            optimization
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleAutoGeneratePO}
            disabled={loading || !projectId}
            className="gap-2"
          >
            <FileText className="h-4 w-4" />
            Auto Generate POs
          </Button>
          <Button
            variant="outline"
            onClick={loadDashboardData}
            disabled={loading}
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Critical Shortages
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {shortages.filter((s) => s.urgency_level === "critical").length}
            </div>
            <p className="text-xs text-muted-foreground">
              Require immediate attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Delivery Plans
            </CardTitle>
            <Truck className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{deliveryPlans.length}</div>
            <p className="text-xs text-muted-foreground">
              Optimized deliveries scheduled
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cost Savings</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(
                inventoryOptimization?.total_value_optimized || 0
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Through smart orchestration
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Auto POs</CardTitle>
            <FileText className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {purchaseOrders.filter((po) => po.auto_generated).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Generated automatically
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="shortages">Shortages</TabsTrigger>
          <TabsTrigger value="deliveries">Deliveries</TabsTrigger>
          <TabsTrigger value="optimization">Optimization</TabsTrigger>
          <TabsTrigger value="purchase-orders">Purchase Orders</TabsTrigger>
          <TabsTrigger value="predictions">Predictions</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Shortages */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Recent Material Shortages
                </CardTitle>
                <CardDescription>
                  Materials requiring immediate attention
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {shortages.slice(0, 5).map((shortage) => (
                    <div
                      key={shortage.material_id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="font-medium">
                          {shortage.material_name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Need {shortage.shortage_amount} more by{" "}
                          {formatDate(shortage.needed_by_date)}
                        </div>
                      </div>
                      <Badge variant={getUrgencyColor(shortage.urgency_level)}>
                        {shortage.urgency_level}
                      </Badge>
                    </div>
                  ))}
                  {shortages.length === 0 && (
                    <div className="text-center py-4 text-muted-foreground">
                      No material shortages detected
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Upcoming Deliveries */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-blue-600" />
                  Upcoming Deliveries
                </CardTitle>
                <CardDescription>Scheduled material deliveries</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {deliveryPlans.slice(0, 5).map((plan, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="font-medium">Material Delivery</div>
                        <div className="text-sm text-muted-foreground">
                          {formatDate(plan.optimal_delivery_date)} •{" "}
                          {plan.quantity_needed} units
                        </div>
                      </div>
                      <Badge variant={getPriorityColor(plan.delivery_priority)}>
                        {plan.delivery_priority}
                      </Badge>
                    </div>
                  ))}
                  {deliveryPlans.length === 0 && (
                    <div className="text-center py-4 text-muted-foreground">
                      No deliveries scheduled
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Shortages Tab */}
        <TabsContent value="shortages" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Material Shortages Analysis</CardTitle>
              <CardDescription>
                Detected shortages with supplier recommendations and urgency
                levels
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {shortages.map((shortage) => (
                  <Card
                    key={shortage.material_id}
                    className="border-l-4 border-l-destructive"
                  >
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-semibold text-lg">
                            {shortage.material_name}
                          </h4>
                          <p className="text-muted-foreground">
                            Need {shortage.shortage_amount} more units by{" "}
                            {formatDate(shortage.needed_by_date)}
                          </p>
                        </div>
                        <Badge
                          variant={getUrgencyColor(shortage.urgency_level)}
                        >
                          {shortage.urgency_level}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div>
                          <div className="text-sm font-medium">Required</div>
                          <div className="text-2xl font-bold">
                            {shortage.required_quantity}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm font-medium">Available</div>
                          <div className="text-2xl font-bold">
                            {shortage.available_quantity}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm font-medium">Shortage</div>
                          <div className="text-2xl font-bold text-destructive">
                            {shortage.shortage_amount}
                          </div>
                        </div>
                      </div>

                      <Separator className="my-4" />

                      <div>
                        <h5 className="font-medium mb-2">
                          Suggested Suppliers
                        </h5>
                        <div className="space-y-2">
                          {shortage.suggested_suppliers
                            .slice(0, 3)
                            .map((supplier, index) => (
                              <div
                                key={index}
                                className="flex items-center justify-between p-2 bg-muted rounded"
                              >
                                <div>
                                  <div className="font-medium">
                                    {supplier.supplier_name}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {supplier.estimated_delivery_days} days •
                                    Min order: {supplier.minimum_order_quantity}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="font-medium">
                                    {formatCurrency(supplier.unit_price)}/unit
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {(supplier.reliability_score * 100).toFixed(
                                      0
                                    )}
                                    % reliable
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {shortages.length === 0 && (
                  <div className="text-center py-8">
                    <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium">
                      No Material Shortages
                    </h3>
                    <p className="text-muted-foreground">
                      All materials are adequately stocked
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Deliveries Tab */}
        <TabsContent value="deliveries" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Delivery Planning & Optimization</CardTitle>
              <CardDescription>
                Just-in-time delivery scheduling with cost optimization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {deliveryPlans.map((plan, index) => (
                  <Card key={index}>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-semibold">Material Delivery</h4>
                          <p className="text-muted-foreground">
                            {plan.quantity_needed} units to{" "}
                            {plan.storage_location}
                          </p>
                        </div>
                        <Badge
                          variant={getPriorityColor(plan.delivery_priority)}
                        >
                          {plan.delivery_priority}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                        <div>
                          <div className="text-sm font-medium">
                            Delivery Date
                          </div>
                          <div className="font-semibold">
                            {formatDate(plan.optimal_delivery_date)}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm font-medium">Time Window</div>
                          <div className="font-semibold">
                            {plan.delivery_window.start_time} -{" "}
                            {plan.delivery_window.end_time}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm font-medium">Quantity</div>
                          <div className="font-semibold">
                            {plan.quantity_needed} units
                          </div>
                        </div>
                        <div>
                          <div className="text-sm font-medium">Storage</div>
                          <div className="font-semibold">
                            {plan.storage_location}
                          </div>
                        </div>
                      </div>

                      <div className="bg-muted p-3 rounded">
                        <h5 className="font-medium mb-2">Cost Optimization</h5>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Bulk:</span>{" "}
                            {formatCurrency(
                              plan.cost_optimization.bulk_discount
                            )}
                          </div>
                          <div>
                            <span className="text-muted-foreground">
                              Early Pay:
                            </span>{" "}
                            {formatCurrency(
                              plan.cost_optimization.early_payment_discount
                            )}
                          </div>
                          <div>
                            <span className="text-muted-foreground">
                              Combined:
                            </span>{" "}
                            {formatCurrency(
                              plan.cost_optimization.combined_delivery_savings
                            )}
                          </div>
                          <div className="font-medium text-green-600">
                            <span className="text-muted-foreground">
                              Total:
                            </span>{" "}
                            {formatCurrency(
                              plan.cost_optimization.total_savings
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {deliveryPlans.length === 0 && (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium">No Delivery Plans</h3>
                    <p className="text-muted-foreground">
                      No materials scheduled for delivery
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Optimization Tab */}
        <TabsContent value="optimization" className="space-y-4">
          {inventoryOptimization && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Cross-Project Inventory Optimization</CardTitle>
                  <CardDescription>
                    Smart inventory management across all projects
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-600">
                        {formatCurrency(
                          inventoryOptimization.total_value_optimized
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Total Value Optimized
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold">
                        {inventoryOptimization.cross_project_transfers.length}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Transfer Opportunities
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-orange-600">
                        {formatCurrency(
                          inventoryOptimization.waste_reduction_potential
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Waste Reduction
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Transfer Opportunities */}
              {inventoryOptimization.cross_project_transfers.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ArrowRightLeft className="h-5 w-5" />
                      Cross-Project Transfer Opportunities
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {inventoryOptimization.cross_project_transfers.map(
                        (transfer, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 border rounded-lg"
                          >
                            <div className="flex-1">
                              <div className="font-medium">
                                Project {transfer.from_project_id.slice(-8)} →
                                Project {transfer.to_project_id.slice(-8)}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {transfer.quantity} units • Transfer on{" "}
                                {formatDate(transfer.transfer_date)}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-medium text-green-600">
                                {formatCurrency(transfer.estimated_savings)}{" "}
                                saved
                              </div>
                              <div className="text-sm text-muted-foreground">
                                Transfer cost:{" "}
                                {formatCurrency(transfer.transfer_cost)}
                              </div>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Consolidation Opportunities */}
              {inventoryOptimization.consolidation_opportunities.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      Bulk Order Consolidation
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {inventoryOptimization.consolidation_opportunities.map(
                        (opportunity, index) => (
                          <div key={index} className="p-3 border rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <div className="font-medium">
                                {opportunity.material_type}
                              </div>
                              <Badge variant="secondary">
                                {opportunity.projects_involved.length} projects
                              </Badge>
                            </div>
                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div>
                                <div className="text-muted-foreground">
                                  Individual Cost
                                </div>
                                <div className="font-medium">
                                  {formatCurrency(
                                    opportunity.individual_orders_cost
                                  )}
                                </div>
                              </div>
                              <div>
                                <div className="text-muted-foreground">
                                  Consolidated Cost
                                </div>
                                <div className="font-medium">
                                  {formatCurrency(
                                    opportunity.consolidated_cost
                                  )}
                                </div>
                              </div>
                              <div>
                                <div className="text-muted-foreground">
                                  Savings
                                </div>
                                <div className="font-medium text-green-600">
                                  {formatCurrency(opportunity.savings_amount)}
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* Purchase Orders Tab */}
        <TabsContent value="purchase-orders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Automated Purchase Orders</CardTitle>
              <CardDescription>
                AI-generated purchase orders based on material shortages
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {purchaseOrders.map((po) => (
                  <Card
                    key={po.po_id}
                    className={
                      po.auto_generated ? "border-l-4 border-l-blue-500" : ""
                    }
                  >
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-semibold">
                            PO #{po.po_id.slice(-8)}
                          </h4>
                          <p className="text-muted-foreground">
                            Supplier: {po.supplier_id} • Delivery:{" "}
                            {formatDate(po.delivery_date)}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {po.auto_generated && (
                            <Badge variant="outline">Auto Generated</Badge>
                          )}
                          <Badge
                            variant={
                              po.status === "approved" ? "default" : "secondary"
                            }
                          >
                            {po.status}
                          </Badge>
                        </div>
                      </div>

                      <div className="mb-4">
                        <div className="text-2xl font-bold">
                          {formatCurrency(po.total_amount)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {po.materials.length} items
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h5 className="font-medium">Items:</h5>
                        {po.materials.map((item, index) => (
                          <div
                            key={index}
                            className="flex justify-between items-center p-2 bg-muted rounded text-sm"
                          >
                            <span>
                              Material ID: {item.material_id.slice(-8)}
                            </span>
                            <span>
                              {item.quantity} ×{" "}
                              {formatCurrency(item.unit_price)} ={" "}
                              {formatCurrency(item.total_price)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {purchaseOrders.length === 0 && (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium">No Purchase Orders</h3>
                    <p className="text-muted-foreground">
                      Click "Auto Generate POs" to create orders for material
                      shortages
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Predictions Tab */}
        <TabsContent value="predictions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Material Usage Predictions</CardTitle>
              <CardDescription>
                AI-powered forecasting for better inventory planning
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {predictions.map((prediction) => (
                  <Card key={prediction.material_id}>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-semibold">
                            Material {prediction.material_id.slice(-8)}
                          </h4>
                          <p className="text-muted-foreground">
                            Pattern: {prediction.usage_pattern}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">
                            Confidence
                          </div>
                          <div className="font-medium">
                            {(prediction.confidence_level * 100).toFixed(0)}%
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div>
                          <div className="text-sm font-medium">
                            Predicted Usage
                          </div>
                          <div className="text-2xl font-bold">
                            {prediction.predicted_usage.toFixed(1)}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm font-medium">
                            Recommended Stock
                          </div>
                          <div className="text-2xl font-bold">
                            {prediction.recommended_stock_level.toFixed(1)}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm font-medium">
                            Reorder Point
                          </div>
                          <div className="text-2xl font-bold">
                            {prediction.reorder_point.toFixed(1)}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Progress
                          value={prediction.confidence_level * 100}
                          className="flex-1"
                        />
                        <span className="text-sm text-muted-foreground">
                          {(prediction.confidence_level * 100).toFixed(0)}%
                          confidence
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {predictions.length === 0 && (
                  <div className="text-center py-8">
                    <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium">
                      No Predictions Available
                    </h3>
                    <p className="text-muted-foreground">
                      Predictions will appear as historical data accumulates
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

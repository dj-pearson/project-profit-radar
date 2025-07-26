import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { formatCurrency } from "@/utils/formatters";
import { useAuth } from "@/contexts/AuthContext";
import {
  DollarSign,
  Calendar,
  User,
  Building2,
  Plus,
  MoreHorizontal,
  TrendingUp,
  Clock,
  Target,
  AlertCircle,
  CheckCircle,
  Activity,
  Zap,
} from "lucide-react";

interface PipelineStage {
  id: string;
  name: string;
  stage_order: number;
  color_code: string;
  probability_weight: number;
  is_won_stage: boolean;
  is_lost_stage: boolean;
  expected_duration_days?: number;
  conversion_rate?: number;
}

interface Deal {
  id: string;
  name: string;
  description?: string;
  estimated_value: number;
  actual_value?: number;
  expected_close_date?: string;
  current_stage_id: string;
  priority: string;
  risk_level: string;
  days_in_pipeline?: number;
  sales_rep_id?: string;
  primary_contact_id?: string;
  lead?: {
    first_name: string;
    last_name: string;
    company_name?: string;
  } | null;
  contact?: {
    first_name: string;
    last_name: string;
    company_name?: string;
  } | null;
  created_at: string;
}

interface EnhancedPipelineKanbanProps {
  onDealClick: (dealId: string) => void;
  showAnalytics?: boolean;
}

export const EnhancedPipelineKanban: React.FC<EnhancedPipelineKanbanProps> = ({
  onDealClick,
  showAnalytics = true,
}) => {
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [dealsByStage, setDealsByStage] = useState<Record<string, Deal[]>>({});
  const [loading, setLoading] = useState(true);
  const [draggedDeal, setDraggedDeal] = useState<Deal | null>(null);
  const { toast } = useToast();
  const { userProfile } = useAuth();

  useEffect(() => {
    loadPipelineData();
  }, []);

  const loadPipelineData = async () => {
    try {
      if (!userProfile?.company_id) return;

      // Load pipeline stages
      const { data: stagesData, error: stagesError } = await supabase
        .from("pipeline_stages")
        .select("*")
        .eq("company_id", userProfile.company_id)
        .order("stage_order");

      if (stagesError) throw stagesError;

      // If no custom stages, create default ones
      let currentStages = stagesData || [];
      if (currentStages.length === 0) {
        const defaultStages = [
          {
            name: "Prospecting",
            stage_order: 1,
            color_code: "#3B82F6",
            probability_weight: 10,
            is_won_stage: false,
            is_lost_stage: false,
          },
          {
            name: "Qualification",
            stage_order: 2,
            color_code: "#F59E0B",
            probability_weight: 25,
            is_won_stage: false,
            is_lost_stage: false,
          },
          {
            name: "Proposal",
            stage_order: 3,
            color_code: "#8B5CF6",
            probability_weight: 50,
            is_won_stage: false,
            is_lost_stage: false,
          },
          {
            name: "Negotiation",
            stage_order: 4,
            color_code: "#EF4444",
            probability_weight: 75,
            is_won_stage: false,
            is_lost_stage: false,
          },
          {
            name: "Closed Won",
            stage_order: 5,
            color_code: "#10B981",
            probability_weight: 100,
            is_won_stage: true,
            is_lost_stage: false,
          },
          {
            name: "Closed Lost",
            stage_order: 6,
            color_code: "#6B7280",
            probability_weight: 0,
            is_won_stage: false,
            is_lost_stage: true,
          },
        ];

        const { data: insertedStages, error: insertError } = await supabase
          .from("pipeline_stages")
          .insert(
            defaultStages.map((stage) => ({
              ...stage,
              company_id: userProfile.company_id,
            }))
          )
          .select();

        if (insertError) throw insertError;
        currentStages = insertedStages || [];
      }

      setStages(currentStages);

      // Load deals
      const { data: dealsData, error: dealsError } = await supabase
        .from("deals")
        .select(
          `
          *,
          lead:leads(first_name, last_name, company_name),
          contact:contacts(first_name, last_name, company_name)
        `
        )
        .eq("company_id", userProfile.company_id)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (dealsError) throw dealsError;

      // Filter and type-cast the deals data to ensure proper typing
      const typedDealsData = (dealsData || []).map((deal: any) => ({
        ...deal,
        lead:
          deal.lead &&
          typeof deal.lead === "object" &&
          "first_name" in deal.lead
            ? deal.lead
            : null,
        contact:
          deal.contact &&
          typeof deal.contact === "object" &&
          "first_name" in deal.contact
            ? deal.contact
            : null,
      })) as Deal[];

      // Group deals by stage
      const grouped = currentStages.reduce((acc, stage) => {
        acc[stage.id] =
          typedDealsData?.filter(
            (deal) => deal.current_stage_id === stage.id
          ) || [];
        return acc;
      }, {} as Record<string, Deal[]>);

      setDealsByStage(grouped);
    } catch (error: any) {
      toast({
        title: "Error loading pipeline data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (start: any) => {
    const dealId = start.draggableId;
    const sourceStageId = start.source.droppableId;
    const deal = dealsByStage[sourceStageId]?.find((d) => d.id === dealId);
    setDraggedDeal(deal || null);
  };

  const handleDragEnd = async (result: any) => {
    const { destination, source, draggableId } = result;
    setDraggedDeal(null);

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const sourceStageId = source.droppableId;
    const destStageId = destination.droppableId;
    const dealId = draggableId;

    try {
      const destStage = stages.find((s) => s.id === destStageId);
      const sourceStage = stages.find((s) => s.id === sourceStageId);
      const deal = dealsByStage[sourceStageId]?.find((d) => d.id === dealId);

      if (!destStage || !deal) return;

      // Calculate days in previous stage
      const daysInPreviousStage = deal.days_in_pipeline || 0;

      // Update deal stage in database
      const { error: updateError } = await supabase
        .from("deals")
        .update({
          current_stage_id: destStageId,
          status: destStage.is_won_stage
            ? "won"
            : destStage.is_lost_stage
            ? "lost"
            : "active",
          actual_close_date:
            destStage.is_won_stage || destStage.is_lost_stage
              ? new Date().toISOString().split("T")[0]
              : null,
        })
        .eq("id", dealId);

      if (updateError) throw updateError;

      // Log stage history
      const { error: historyError } = await supabase
        .from("deal_stage_history")
        .insert({
          deal_id: dealId,
          from_stage_id: sourceStageId,
          to_stage_id: destStageId,
          moved_by: userProfile?.id,
          days_in_previous_stage: daysInPreviousStage,
          value_before: deal.estimated_value,
          value_after: deal.estimated_value,
          probability_before: sourceStage?.probability_weight || 0,
          probability_after: destStage.probability_weight,
        });

      if (historyError)
        console.warn("Failed to log stage history:", historyError);

      // Update local state with animation
      const sourceDeals = Array.from(dealsByStage[sourceStageId]);
      const destDeals = Array.from(dealsByStage[destStageId]);
      const [movedDeal] = sourceDeals.splice(source.index, 1);

      movedDeal.current_stage_id = destStageId;
      destDeals.splice(destination.index, 0, movedDeal);

      setDealsByStage({
        ...dealsByStage,
        [sourceStageId]: sourceDeals,
        [destStageId]: destDeals,
      });

      toast({
        title: "Deal moved successfully",
        description: `"${deal.name}" moved to ${destStage.name}`,
        variant: destStage.is_won_stage ? "default" : undefined,
      });
    } catch (error: any) {
      toast({
        title: "Error moving deal",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "urgent":
        return <AlertCircle className="h-3 w-3 text-red-500" />;
      case "high":
        return <TrendingUp className="h-3 w-3 text-orange-500" />;
      case "medium":
        return <Clock className="h-3 w-3 text-yellow-500" />;
      case "low":
        return <CheckCircle className="h-3 w-3 text-green-500" />;
      default:
        return <Activity className="h-3 w-3 text-gray-500" />;
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "critical":
        return "border-l-red-500 bg-red-50";
      case "high":
        return "border-l-orange-500 bg-orange-50";
      case "medium":
        return "border-l-yellow-500 bg-yellow-50";
      case "low":
        return "border-l-green-500 bg-green-50";
      default:
        return "border-l-gray-500 bg-gray-50";
    }
  };

  const getStageColor = (colorCode: string) => {
    const hex = colorCode?.replace("#", "") || "6B7280";
    return {
      backgroundColor: `#${hex}20`,
      borderColor: `#${hex}`,
      color: `#${hex}`,
    };
  };

  const calculateStageMetrics = (stageId: string, deals: Deal[]) => {
    const totalValue = deals.reduce(
      (sum, deal) => sum + deal.estimated_value,
      0
    );
    const weightedValue = deals.reduce((sum, deal) => {
      const stage = stages.find((s) => s.id === stageId);
      return (
        sum + (deal.estimated_value * (stage?.probability_weight || 0)) / 100
      );
    }, 0);

    return { totalValue, weightedValue, count: deals.length };
  };

  const getContactName = (deal: Deal) => {
    if (deal.contact) {
      return `${deal.contact.first_name} ${deal.contact.last_name}`;
    }
    if (deal.lead) {
      return `${deal.lead.first_name} ${deal.lead.last_name}`;
    }
    return "No contact";
  };

  const getCompanyName = (deal: Deal) => {
    return (
      deal.contact?.company_name || deal.lead?.company_name || "Individual"
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        {/* Pipeline Analytics Header */}
        {showAnalytics && (
          <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <Target className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Total Pipeline
                    </p>
                    <p className="text-2xl font-bold">
                      {formatCurrency(
                        Object.values(dealsByStage)
                          .flat()
                          .reduce((sum, deal) => sum + deal.estimated_value, 0)
                      )}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Weighted Value
                    </p>
                    <p className="text-2xl font-bold">
                      {formatCurrency(
                        Object.entries(dealsByStage).reduce(
                          (sum, [stageId, deals]) => {
                            const stage = stages.find((s) => s.id === stageId);
                            return (
                              sum +
                              deals.reduce(
                                (stageSum, deal) =>
                                  stageSum +
                                  (deal.estimated_value *
                                    (stage?.probability_weight || 0)) /
                                    100,
                                0
                              )
                            );
                          },
                          0
                        )
                      )}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <Activity className="h-5 w-5 text-purple-600" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Active Deals
                    </p>
                    <p className="text-2xl font-bold">
                      {Object.values(dealsByStage).flat().length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-orange-600" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Avg Deal Size
                    </p>
                    <p className="text-2xl font-bold">
                      {formatCurrency(
                        Object.values(dealsByStage).flat().length > 0
                          ? Object.values(dealsByStage)
                              .flat()
                              .reduce(
                                (sum, deal) => sum + deal.estimated_value,
                                0
                              ) / Object.values(dealsByStage).flat().length
                          : 0
                      )}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Mobile: Vertical Stack */}
        <div className="block md:hidden space-y-4">
          {stages.map((stage) => {
            const stageDeals = dealsByStage[stage.id] || [];
            const metrics = calculateStageMetrics(stage.id, stageDeals);

            return (
              <Card key={stage.id} className="animate-fade-in">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">
                      <Badge
                        style={getStageColor(stage.color_code)}
                        className="border-2"
                      >
                        {stage.name} ({metrics.count})
                      </Badge>
                    </CardTitle>
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">
                      Total: {formatCurrency(metrics.totalValue)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Weighted: {formatCurrency(metrics.weightedValue)}
                    </div>
                    <Progress
                      value={stage.probability_weight}
                      className="h-1"
                    />
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <Droppable droppableId={stage.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`space-y-2 min-h-[120px] p-2 rounded-md transition-colors ${
                          snapshot.isDraggingOver
                            ? "bg-muted/50 border-2 border-dashed border-primary"
                            : ""
                        }`}
                      >
                        {stageDeals.map((deal, index) => (
                          <Draggable
                            key={deal.id}
                            draggableId={deal.id}
                            index={index}
                          >
                            {(provided, snapshot) => (
                              <Card
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`cursor-pointer transition-all duration-200 hover:shadow-md border-l-4 ${getRiskColor(
                                  deal.risk_level
                                )} ${
                                  snapshot.isDragging
                                    ? "shadow-lg scale-105 rotate-2"
                                    : ""
                                } animate-scale-in`}
                                onClick={() => onDealClick(deal.id)}
                              >
                                <CardContent className="p-3">
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                      <h4 className="font-medium text-sm truncate">
                                        {deal.name}
                                      </h4>
                                      <div className="flex items-center space-x-1">
                                        {getPriorityIcon(deal.priority)}
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-4 w-4"
                                        >
                                          <MoreHorizontal className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </div>

                                    <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                                      <Building2 className="h-3 w-3" />
                                      <span className="truncate">
                                        {getCompanyName(deal)}
                                      </span>
                                    </div>

                                    <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                                      <User className="h-3 w-3" />
                                      <span className="truncate">
                                        {getContactName(deal)}
                                      </span>
                                    </div>

                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center space-x-1 text-xs">
                                        <DollarSign className="h-3 w-3 text-green-600" />
                                        <span className="font-medium">
                                          {formatCurrency(deal.estimated_value)}
                                        </span>
                                      </div>
                                      <Badge
                                        variant="outline"
                                        className="text-xs"
                                      >
                                        {deal.risk_level}
                                      </Badge>
                                    </div>

                                    {deal.expected_close_date && (
                                      <div className="flex items-center space-x-1 text-xs text-orange-600">
                                        <Calendar className="h-3 w-3" />
                                        <span>
                                          {new Date(
                                            deal.expected_close_date
                                          ).toLocaleDateString()}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </CardContent>
                              </Card>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Desktop: Horizontal Kanban */}
        <div className="hidden md:flex space-x-4 overflow-x-auto pb-4 min-h-0">
          {stages.map((stage) => {
            const stageDeals = dealsByStage[stage.id] || [];
            const metrics = calculateStageMetrics(stage.id, stageDeals);

            return (
              <div
                key={stage.id}
                className="min-w-[320px] flex-shrink-0 animate-fade-in"
              >
                <Card className="h-full">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium">
                        <Badge
                          style={getStageColor(stage.color_code)}
                          className="border-2"
                        >
                          {stage.name} ({metrics.count})
                        </Badge>
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 hover-scale"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground">
                        Total: {formatCurrency(metrics.totalValue)}
                      </div>
                      <div className="text-xs font-medium text-green-600">
                        Weighted: {formatCurrency(metrics.weightedValue)}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Progress
                          value={stage.probability_weight}
                          className="h-2 flex-1"
                        />
                        <span className="text-xs text-muted-foreground">
                          {stage.probability_weight}%
                        </span>
                      </div>
                      {stage.expected_duration_days && (
                        <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>~{stage.expected_duration_days} days</span>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Droppable droppableId={stage.id}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`space-y-3 min-h-[400px] p-2 rounded-md transition-all duration-300 ${
                            snapshot.isDraggingOver
                              ? "bg-primary/10 border-2 border-dashed border-primary shadow-inner"
                              : ""
                          }`}
                        >
                          {stageDeals.map((deal, index) => (
                            <Draggable
                              key={deal.id}
                              draggableId={deal.id}
                              index={index}
                            >
                              {(provided, snapshot) => (
                                <Card
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`cursor-pointer transition-all duration-200 hover:shadow-lg border-l-4 ${getRiskColor(
                                    deal.risk_level
                                  )} ${
                                    snapshot.isDragging
                                      ? "shadow-xl scale-105 rotate-2 z-50"
                                      : "hover:scale-102 hover:-translate-y-1"
                                  } animate-scale-in`}
                                  onClick={() => onDealClick(deal.id)}
                                >
                                  <CardContent className="p-4">
                                    <div className="space-y-3">
                                      <div className="flex items-center justify-between">
                                        <h4 className="font-medium text-sm truncate flex-1 mr-2">
                                          {deal.name}
                                        </h4>
                                        <div className="flex items-center space-x-1">
                                          {getPriorityIcon(deal.priority)}
                                        </div>
                                      </div>

                                      <div className="space-y-2">
                                        <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                                          <Building2 className="h-3 w-3" />
                                          <span className="truncate">
                                            {getCompanyName(deal)}
                                          </span>
                                        </div>

                                        <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                                          <User className="h-3 w-3" />
                                          <span className="truncate">
                                            {getContactName(deal)}
                                          </span>
                                        </div>
                                      </div>

                                      <div className="flex items-center space-x-1 text-sm font-semibold text-green-600">
                                        <DollarSign className="h-4 w-4" />
                                        <span>
                                          {formatCurrency(deal.estimated_value)}
                                        </span>
                                      </div>

                                      {deal.expected_close_date && (
                                        <div className="flex items-center space-x-1 text-xs text-orange-600">
                                          <Calendar className="h-3 w-3" />
                                          <span>
                                            Close:{" "}
                                            {new Date(
                                              deal.expected_close_date
                                            ).toLocaleDateString()}
                                          </span>
                                        </div>
                                      )}

                                      <div className="flex items-center justify-between pt-2 border-t">
                                        <Badge
                                          variant="outline"
                                          className="text-xs"
                                        >
                                          {deal.risk_level} risk
                                        </Badge>
                                        {deal.days_in_pipeline && (
                                          <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                                            <Clock className="h-3 w-3" />
                                            <span>
                                              {deal.days_in_pipeline}d
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
};

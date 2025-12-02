import React, { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { EnhancedPipelineKanban } from "@/components/crm/EnhancedPipelineKanban";
import { PipelineSettings } from "@/components/crm/PipelineSettings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { migrateCurrentUserOpportunities } from "@/utils/migrateOpportunitiesToDeals";
import { RefreshCw, Database, AlertCircle } from "lucide-react";

const CRMPipeline = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleMigrateData = async () => {
    setIsLoading(true);
    try {
      const result = await migrateCurrentUserOpportunities();

      if (result.success) {
        toast({
          title: "Migration Successful!",
          description: `Migrated ${result.migrated} opportunities to pipeline. Please refresh to see the updated data.`,
          variant: "default",
        });

        // Reload the page to show updated data
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        toast({
          title: "Migration Failed",
          description: result.error || "Unknown error occurred",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Migration Error",
        description: "An unexpected error occurred during migration",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardLayout title="Pipeline Management">
      <div className="space-y-6">
        {/* Data Sync Notice */}
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              <CardTitle className="text-orange-800">
                Data Sync Available
              </CardTitle>
            </div>
            <CardDescription className="text-orange-700">
              Missing deals in your pipeline? Your opportunities from the CRM
              Dashboard can be migrated to the new pipeline system.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <Button
              onClick={handleMigrateData}
              disabled={isLoading}
              variant="outline"
              className="border-orange-300 text-orange-700 hover:bg-orange-100"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Migrating...
                </>
              ) : (
                <>
                  <Database className="mr-2 h-4 w-4" />
                  Sync CRM Data to Pipeline
                </>
              )}
            </Button>
            <Badge variant="secondary" className="ml-2">
              One-time sync
            </Badge>
          </CardContent>
        </Card>

        <Tabs defaultValue="kanban" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="kanban">Pipeline View</TabsTrigger>
            <TabsTrigger value="settings">Pipeline Settings</TabsTrigger>
          </TabsList>
          <TabsContent value="kanban" className="space-y-6">
            <EnhancedPipelineKanban
              onDealClick={() => {}}
              showAnalytics={true}
            />
          </TabsContent>
          <TabsContent value="settings" className="space-y-6">
            <PipelineSettings />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default CRMPipeline;

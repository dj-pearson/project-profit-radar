import React from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { EnhancedPipelineKanban } from "@/components/crm/EnhancedPipelineKanban";
import { PipelineSettings } from "@/components/crm/PipelineSettings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const CRMPipeline = () => {
  return (
    <DashboardLayout title="Pipeline Management">
      <div className="space-y-6">
        <Tabs defaultValue="kanban" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="kanban">Pipeline View</TabsTrigger>
            <TabsTrigger value="settings">Pipeline Settings</TabsTrigger>
          </TabsList>
          <TabsContent value="kanban" className="space-y-6">
            <EnhancedPipelineKanban
              onDealClick={(deal) => console.log("Deal clicked:", deal)}
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

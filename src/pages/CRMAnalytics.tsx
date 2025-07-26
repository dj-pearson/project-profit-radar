import React from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PipelineAnalytics } from "@/components/crm/PipelineAnalytics";
import { ActivityStream } from "@/components/crm/ActivityStream";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const CRMAnalytics = () => {
  return (
    <DashboardLayout title="CRM Analytics">
      <div className="space-y-6">
        <Tabs defaultValue="pipeline" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pipeline">Pipeline Analytics</TabsTrigger>
            <TabsTrigger value="activity">Activity Stream</TabsTrigger>
          </TabsList>
          <TabsContent value="pipeline" className="space-y-6">
            <PipelineAnalytics />
          </TabsContent>
          <TabsContent value="activity" className="space-y-6">
            <ActivityStream />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default CRMAnalytics;

import React from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PipelineAnalytics } from "@/components/crm/PipelineAnalytics";
import { ActivityStream } from "@/components/crm/ActivityStream";
import { RevenueForecasting } from "@/components/crm/RevenueForecasting";
import { LeadConversionAnalytics } from "@/components/crm/LeadConversionAnalytics";
import { TeamPerformanceTracking } from "@/components/crm/TeamPerformanceTracking";
import { PerformanceMetrics } from "@/components/crm/PerformanceMetrics";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const CRMAnalytics = () => {
  return (
    <DashboardLayout title="CRM Analytics">
      <div className="space-y-6">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
            <TabsTrigger value="forecasting">Forecasting</TabsTrigger>
            <TabsTrigger value="conversion">Conversion</TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="space-y-6">
            <PerformanceMetrics />
          </TabsContent>
          <TabsContent value="pipeline" className="space-y-6">
            <PipelineAnalytics />
          </TabsContent>
          <TabsContent value="forecasting" className="space-y-6">
            <RevenueForecasting />
          </TabsContent>
          <TabsContent value="conversion" className="space-y-6">
            <LeadConversionAnalytics />
          </TabsContent>
          <TabsContent value="team" className="space-y-6">
            <TeamPerformanceTracking />
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

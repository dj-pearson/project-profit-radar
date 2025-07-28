import React from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { SocialMediaScheduler } from "@/components/marketing/SocialMediaScheduler";
import { EmailMarketingCampaigns } from "@/components/marketing/EmailMarketingCampaigns";
import { LeadNurturingWorkflows } from "@/components/marketing/LeadNurturingWorkflows";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const MarketingAutomation = () => {
  return (
    <DashboardLayout title="Marketing Automation">
      <div className="space-y-6">
        <Tabs defaultValue="social" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="social">Social Media</TabsTrigger>
            <TabsTrigger value="email">Email Campaigns</TabsTrigger>
            <TabsTrigger value="workflows">Lead Nurturing</TabsTrigger>
          </TabsList>
          <TabsContent value="social" className="space-y-6">
            <SocialMediaScheduler />
          </TabsContent>
          <TabsContent value="email" className="space-y-6">
            <EmailMarketingCampaigns />
          </TabsContent>
          <TabsContent value="workflows" className="space-y-6">
            <LeadNurturingWorkflows />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default MarketingAutomation;
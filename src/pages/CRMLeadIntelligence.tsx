import React from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { EnhancedLeadIntelligence } from "@/components/crm/EnhancedLeadIntelligence";
import { LeadScoring } from "@/components/crm/LeadScoring";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const CRMLeadIntelligence = () => {
  return (
    <DashboardLayout title="Lead Intelligence">
      <div className="space-y-6">
        <Tabs defaultValue="intelligence" className="w-full" aria-label="Lead intelligence sections">
          <TabsList className="grid w-full grid-cols-2" aria-label="Intelligence categories">
            <TabsTrigger value="intelligence">Lead Intelligence</TabsTrigger>
            <TabsTrigger value="scoring">Lead Scoring</TabsTrigger>
          </TabsList>
          <TabsContent value="intelligence" className="space-y-6">
            <EnhancedLeadIntelligence />
          </TabsContent>
          <TabsContent value="scoring" className="space-y-6">
            <LeadScoring />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default CRMLeadIntelligence;

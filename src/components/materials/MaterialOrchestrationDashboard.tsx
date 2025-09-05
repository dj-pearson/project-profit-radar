import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface MaterialOrchestrationDashboardProps {
  projectId?: string;
}

export const MaterialOrchestrationDashboard: React.FC<MaterialOrchestrationDashboardProps> = ({ 
  projectId 
}) => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Material Orchestration Dashboard</CardTitle>
          <CardDescription>
            Optimize material deliveries and inventory management
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              Material orchestration features are being updated. 
              Please check back later for enhanced inventory management.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
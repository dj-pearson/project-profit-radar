import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ConstructionTimelineManagerProps {
  projectId?: string;
}

export const ConstructionTimelineManager: React.FC<ConstructionTimelineManagerProps> = ({ 
  projectId 
}) => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Construction Timeline Manager</CardTitle>
          <CardDescription>
            Manage project timelines and task dependencies
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              Timeline management functionality is being updated. 
              Please check back later for enhanced scheduling features.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
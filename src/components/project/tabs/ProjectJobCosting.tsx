import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ProjectJobCostingProps {
  projectId: string;
  projectBudget?: number;
  onNavigate?: (path: string) => void;
}
export const ProjectJobCosting: React.FC<ProjectJobCostingProps> = ({ projectId }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Job Costing</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Job costing functionality will be available soon.
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Project ID: {projectId}
        </p>
      </CardContent>
    </Card>
  );
};

export default ProjectJobCosting;
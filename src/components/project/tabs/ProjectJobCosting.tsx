import React from 'react';
import RealTimeJobCosting from '@/components/financial/RealTimeJobCosting';

interface ProjectJobCostingProps {
  projectId: string;
  projectBudget?: number;
  onNavigate?: (path: string) => void;
}

export const ProjectJobCosting: React.FC<ProjectJobCostingProps> = ({ projectId }) => {
  return <RealTimeJobCosting projectId={projectId} />;
};

export default ProjectJobCosting;
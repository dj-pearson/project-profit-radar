import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Plus, Edit, Settings } from 'lucide-react';
import EquipmentGanttChart from './EquipmentGanttChart';

interface ProjectEquipmentViewProps {
  projectId: string;
  onAssignmentChange?: () => void;
}

const ProjectEquipmentView: React.FC<ProjectEquipmentViewProps> = ({
  projectId,
  onAssignmentChange
}) => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Project Equipment Schedule
            </CardTitle>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Assign Equipment
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            View and manage equipment assignments for this project. Equipment shown here is allocated from your equipment bank during the specified time periods.
          </p>
          
          <EquipmentGanttChart 
            projectId={projectId}
            onAssignmentChange={onAssignmentChange}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default ProjectEquipmentView;
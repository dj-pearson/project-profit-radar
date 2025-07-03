import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Briefcase, 
  Play, 
  CheckCircle, 
  Clock,
  DollarSign
} from 'lucide-react';

const ProjectPipeline = () => {
  // Mock data - replace with real data from Supabase
  const pipelineData = {
    active: {
      count: 4,
      value: 285000,
      projects: [
        { name: 'Kitchen Renovation', value: 25000, progress: 65 },
        { name: 'Office Buildout', value: 75000, progress: 40 },
        { name: 'Warehouse Extension', value: 125000, progress: 25 },
        { name: 'Bathroom Remodel', value: 15000, progress: 80 }
      ]
    },
    upcoming: {
      count: 3,
      value: 180000,
      projects: [
        { name: 'Retail Store Fit-out', value: 65000, startDate: '2024-02-15' },
        { name: 'Residential Addition', value: 85000, startDate: '2024-03-01' },
        { name: 'Commercial HVAC', value: 30000, startDate: '2024-02-20' }
      ]
    },
    completed: {
      count: 8,
      value: 420000,
      thisMonth: 2
    }
  };

  const totalPipelineValue = pipelineData.active.value + pipelineData.upcoming.value + pipelineData.completed.value;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Briefcase className="h-5 w-5" />
          Project Pipeline
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Pipeline Summary */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 bg-blue-50 rounded">
            <div className="text-lg font-bold text-blue-600">{pipelineData.active.count}</div>
            <div className="text-xs text-muted-foreground">Active</div>
          </div>
          <div className="p-2 bg-orange-50 rounded">
            <div className="text-lg font-bold text-orange-600">{pipelineData.upcoming.count}</div>
            <div className="text-xs text-muted-foreground">Upcoming</div>
          </div>
          <div className="p-2 bg-green-50 rounded">
            <div className="text-lg font-bold text-green-600">{pipelineData.completed.count}</div>
            <div className="text-xs text-muted-foreground">Completed</div>
          </div>
        </div>

        {/* Total Pipeline Value */}
        <div className="p-3 border rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total Pipeline Value</span>
            <span className="font-bold text-lg">${totalPipelineValue.toLocaleString()}</span>
          </div>
        </div>

        {/* Active Projects */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Play className="h-4 w-4 text-blue-500" />
            Active Projects
          </h4>
          {pipelineData.active.projects.map((project, index) => (
            <div key={index} className="p-2 border rounded">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{project.name}</span>
                <span className="text-sm font-bold">${project.value.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>Progress</span>
                <span>{project.progress}%</span>
              </div>
              <Progress value={project.progress} className="h-1" />
            </div>
          ))}
        </div>

        {/* Upcoming Projects */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4 text-orange-500" />
            Upcoming Projects
          </h4>
          {pipelineData.upcoming.projects.slice(0, 2).map((project, index) => (
            <div key={index} className="p-2 border rounded">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">{project.name}</div>
                  <div className="text-xs text-muted-foreground">
                    Starts: {new Date(project.startDate).toLocaleDateString()}
                  </div>
                </div>
                <span className="text-sm font-bold">${project.value.toLocaleString()}</span>
              </div>
            </div>
          ))}
          {pipelineData.upcoming.projects.length > 2 && (
            <div className="text-xs text-muted-foreground text-center">
              +{pipelineData.upcoming.projects.length - 2} more upcoming
            </div>
          )}
        </div>

        {/* Completed This Month */}
        <div className="p-3 bg-green-50 rounded-lg">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-sm">
              <strong>{pipelineData.completed.thisMonth}</strong> projects completed this month
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProjectPipeline;
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, User, DollarSign } from "lucide-react";

interface Project {
  id: string;
  name: string;
  client_name: string;
  site_address: string;
  status: string;
  completion_percentage: number;
  budget: number;
  start_date: string;
  end_date: string;
}

interface ProjectCardProps {
  project: Project;
  onViewProject: (projectId: string) => void;
}

export const ProjectCard = ({ project, onViewProject }: ProjectCardProps) => {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
      case 'in_progress':
        return 'default';
      case 'completed':
        return 'secondary';
      case 'on_hold':
        return 'outline';
      case 'planning':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getHealthColor = (completion: number, status: string) => {
    if (status === 'completed') return 'text-green-600';
    if (completion >= 75) return 'text-green-600';
    if (completion >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">{project.name}</CardTitle>
            <div className="flex items-center text-sm text-muted-foreground">
              <User className="h-3 w-3 mr-1" />
              {project.client_name}
            </div>
          </div>
          <Badge variant={getStatusColor(project.status)}>
            {project.status.replace('_', ' ')}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {project.site_address && (
          <div className="flex items-center text-sm text-muted-foreground">
            <MapPin className="h-3 w-3 mr-1" />
            {project.site_address}
          </div>
        )}
        
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Progress</span>
            <span className={getHealthColor(project.completion_percentage, project.status)}>
              {project.completion_percentage}%
            </span>
          </div>
          <Progress value={project.completion_percentage} className="h-2" />
        </div>

        {project.budget && (
          <div className="flex items-center text-sm text-muted-foreground">
            <DollarSign className="h-3 w-3 mr-1" />
            Budget: ${project.budget.toLocaleString()}
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center">
            <Calendar className="h-3 w-3 mr-1" />
            {new Date(project.start_date).toLocaleDateString()}
          </div>
          <div>
            Due: {new Date(project.end_date).toLocaleDateString()}
          </div>
        </div>

        <Button 
          variant="outline" 
          size="sm" 
          className="w-full"
          onClick={() => onViewProject(project.id)}
        >
          View Project
        </Button>
      </CardContent>
    </Card>
  );
};
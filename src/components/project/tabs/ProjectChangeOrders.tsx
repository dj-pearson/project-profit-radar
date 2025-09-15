import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  FileX, 
  PlusCircle,
  ExternalLink
} from 'lucide-react';

interface ProjectChangeOrdersProps {
  projectId: string;
  onNavigate: (path: string) => void;
}

export const ProjectChangeOrders: React.FC<ProjectChangeOrdersProps> = ({
  projectId,
  onNavigate
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center">
            <FileX className="h-5 w-5 mr-2" />
            Change Orders (0)
          </span>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              onClick={() => onNavigate(`/change-orders?project=${projectId}`)}
              variant="outline"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View All
            </Button>
            <Button 
              size="sm" 
              onClick={() => onNavigate('/change-orders/create')}
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Create Change Order
            </Button>
          </div>
        </CardTitle>
        <CardDescription>
          Project modifications and budget adjustments
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8">
          <FileX className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">No change orders for this project yet</p>
          <Button onClick={() => onNavigate('/change-orders/create')} variant="outline">
            <PlusCircle className="h-4 w-4 mr-2" />
            Create First Change Order
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
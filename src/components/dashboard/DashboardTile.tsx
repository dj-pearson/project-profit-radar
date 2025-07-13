import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GripVertical, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardTileProps {
  id: string;
  title: string;
  children: React.ReactNode;
  onRemove?: (id: string) => void;
  className?: string;
  dragHandleProps?: any;
  isDragging?: boolean;
}

export const DashboardTile = ({ 
  id, 
  title, 
  children, 
  onRemove,
  className,
  dragHandleProps,
  isDragging 
}: DashboardTileProps) => {
  return (
    <Card className={cn(
      "transition-all duration-200",
      isDragging && "opacity-50 shadow-lg",
      className
    )}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground cursor-grab"
            {...dragHandleProps}
          >
            <GripVertical className="h-3 w-3" />
          </Button>
          {onRemove && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
              onClick={() => onRemove(id)}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {children}
      </CardContent>
    </Card>
  );
};
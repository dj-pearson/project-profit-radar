import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { GripVertical, X, Maximize2, Minimize2, Square } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardTileProps {
  id: string;
  title: string;
  children: React.ReactNode;
  size?: 'small' | 'medium' | 'large';
  onRemove?: (id: string) => void;
  onResize?: (id: string, newSize: 'small' | 'medium' | 'large') => void;
  className?: string;
  dragHandleProps?: any;
  isDragging?: boolean;
}

export const DashboardTile = ({ 
  id, 
  title, 
  children, 
  size = 'medium',
  onRemove,
  onResize,
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
          {onResize && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                >
                  {size === 'small' && <Minimize2 className="h-3 w-3" />}
                  {size === 'medium' && <Square className="h-3 w-3" />}
                  {size === 'large' && <Maximize2 className="h-3 w-3" />}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onResize(id, 'small')}>
                  <Minimize2 className="h-3 w-3 mr-2" />
                  Small
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onResize(id, 'medium')}>
                  <Square className="h-3 w-3 mr-2" />
                  Medium
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onResize(id, 'large')}>
                  <Maximize2 className="h-3 w-3 mr-2" />
                  Large
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
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
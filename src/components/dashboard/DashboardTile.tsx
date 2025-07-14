import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GripVertical, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardTileProps {
  id: string;
  title: string;
  children: React.ReactNode;
  size?: 'small' | 'medium' | 'large';
  width?: number;
  height?: number;
  onRemove?: (id: string) => void;
  onResize?: (id: string, newSize: 'small' | 'medium' | 'large') => void;
  onUpdateSize?: (id: string, width: number, height: number) => void;
  className?: string;
  dragHandleProps?: any;
  isDragging?: boolean;
}

export const DashboardTile = ({ 
  id, 
  title, 
  children, 
  size = 'medium',
  width = 2,
  height = 1,
  onRemove,
  onResize,
  onUpdateSize,
  className,
  dragHandleProps,
  isDragging 
}: DashboardTileProps) => {
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState<string>('');
  const cardRef = useRef<HTMLDivElement>(null);
  const startPos = useRef({ x: 0, y: 0, width: 0, height: 0 });

  const handleResizeStart = (e: React.MouseEvent | React.TouchEvent, direction: string) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setResizeDirection(direction);
    
    // Get coordinates from mouse or touch event
    const clientX = 'clientX' in e ? e.clientX : e.touches[0]?.clientX || 0;
    const clientY = 'clientY' in e ? e.clientY : e.touches[0]?.clientY || 0;
    
    startPos.current = {
      x: clientX,
      y: clientY,
      width: width || 2,
      height: height || 1
    };

    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!onUpdateSize) return;
      
      // Get coordinates from mouse or touch event
      const moveX = 'clientX' in e ? e.clientX : (e as TouchEvent).touches[0]?.clientX || 0;
      const moveY = 'clientY' in e ? e.clientY : (e as TouchEvent).touches[0]?.clientY || 0;
      
      const deltaX = moveX - startPos.current.x;
      const deltaY = moveY - startPos.current.y;
      
      let newWidth = startPos.current.width;
      let newHeight = startPos.current.height;
      
      if (direction.includes('right')) {
        newWidth = Math.max(1, Math.min(3, startPos.current.width + Math.round(deltaX / 200)));
      }
      if (direction.includes('left')) {
        newWidth = Math.max(1, Math.min(3, startPos.current.width - Math.round(deltaX / 200)));
      }
      if (direction.includes('bottom')) {
        newHeight = Math.max(1, Math.min(3, startPos.current.height + Math.round(deltaY / 150)));
      }
      if (direction.includes('top')) {
        newHeight = Math.max(1, Math.min(3, startPos.current.height - Math.round(deltaY / 150)));
      }
      
      onUpdateSize(id, newWidth, newHeight);
    };

    const handleEnd = () => {
      setIsResizing(false);
      setResizeDirection('');
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('touchend', handleEnd);
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchmove', handleMove, { passive: false });
    document.addEventListener('touchend', handleEnd);
  };

  return (
    <Card 
      ref={cardRef}
      className={cn(
        "transition-all duration-200 relative group",
        isDragging && "opacity-50 shadow-lg",
        className
      )}
    >
      {/* Resize handles */}
      <div 
        className="absolute top-0 right-0 w-3 h-full cursor-e-resize opacity-0 md:group-hover:opacity-100 bg-primary/20 transition-opacity touch-none"
        onMouseDown={(e) => handleResizeStart(e, 'right')}
        onTouchStart={(e) => handleResizeStart(e, 'right')}
      />
      <div 
        className="absolute bottom-0 left-0 w-full h-3 cursor-s-resize opacity-0 md:group-hover:opacity-100 bg-primary/20 transition-opacity touch-none"
        onMouseDown={(e) => handleResizeStart(e, 'bottom')}
        onTouchStart={(e) => handleResizeStart(e, 'bottom')}
      />
      <div 
        className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize opacity-0 md:group-hover:opacity-100 bg-primary/40 transition-opacity touch-none"
        onMouseDown={(e) => handleResizeStart(e, 'bottom-right')}
        onTouchStart={(e) => handleResizeStart(e, 'bottom-right')}
      />
      
      {/* Mobile resize handles - always visible on mobile */}
      <div className="md:hidden">
        <div 
          className="absolute top-0 right-0 w-4 h-full bg-primary/30 touch-none"
          onTouchStart={(e) => handleResizeStart(e, 'right')}
        />
        <div 
          className="absolute bottom-0 left-0 w-full h-4 bg-primary/30 touch-none"
          onTouchStart={(e) => handleResizeStart(e, 'bottom')}
        />
        <div 
          className="absolute bottom-0 right-0 w-6 h-6 bg-primary/50 rounded-tl-lg touch-none"
          onTouchStart={(e) => handleResizeStart(e, 'bottom-right')}
        />
      </div>
      
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
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
import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Settings } from 'lucide-react';
import { DashboardTile } from './DashboardTile';
import { DeadlinesWidget } from './widgets/DeadlinesWidget';
import { TodoWidget } from './widgets/TodoWidget';
import { ProjectStatusWidget } from './widgets/ProjectStatusWidget';
import { MetricsWidget } from './widgets/MetricsWidget';

interface DashboardWidget {
  id: string;
  type: string;
  title: string;
  size: 'small' | 'medium' | 'large';
}

const AVAILABLE_WIDGETS = [
  { type: 'deadlines', title: 'Upcoming Deadlines', size: 'medium' as const },
  { type: 'todos', title: 'My Tasks', size: 'medium' as const },
  { type: 'projects', title: 'Active Projects', size: 'large' as const },
  { type: 'metrics', title: 'Key Metrics', size: 'medium' as const },
];

const DEFAULT_WIDGETS: DashboardWidget[] = [
  { id: '1', type: 'metrics', title: 'Key Metrics', size: 'medium' },
  { id: '2', type: 'deadlines', title: 'Upcoming Deadlines', size: 'medium' },
  { id: '3', type: 'todos', title: 'My Tasks', size: 'medium' },
  { id: '4', type: 'projects', title: 'Active Projects', size: 'large' },
];

export const DragDropDashboard = () => {
  const [widgets, setWidgets] = useState<DashboardWidget[]>(DEFAULT_WIDGETS);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  // Load saved layout from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('dashboard-layout');
    if (saved) {
      try {
        setWidgets(JSON.parse(saved));
      } catch (error) {
        console.error('Error loading saved layout:', error);
      }
    }
  }, []);

  // Save layout to localStorage
  useEffect(() => {
    localStorage.setItem('dashboard-layout', JSON.stringify(widgets));
  }, [widgets]);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(widgets);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setWidgets(items);
  };

  const removeWidget = (id: string) => {
    setWidgets(prev => prev.filter(w => w.id !== id));
  };

  const addWidget = (type: string) => {
    const widget = AVAILABLE_WIDGETS.find(w => w.type === type);
    if (!widget) return;

    const newWidget: DashboardWidget = {
      id: Date.now().toString(),
      type: widget.type,
      title: widget.title,
      size: widget.size
    };

    setWidgets(prev => [...prev, newWidget]);
    setIsAddDialogOpen(false);
  };

  const renderWidget = (widget: DashboardWidget) => {
    switch (widget.type) {
      case 'deadlines':
        return <DeadlinesWidget />;
      case 'todos':
        return <TodoWidget />;
      case 'projects':
        return <ProjectStatusWidget />;
      case 'metrics':
        return <MetricsWidget />;
      default:
        return <div className="text-sm text-muted-foreground">Unknown widget type</div>;
    }
  };

  const getWidgetClassName = (size: string) => {
    switch (size) {
      case 'small':
        return 'col-span-1';
      case 'large':
        return 'col-span-1 md:col-span-2';
      default:
        return 'col-span-1';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Dashboard</h2>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Widget
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Dashboard Widget</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              {AVAILABLE_WIDGETS.map((widget) => (
                <Card
                  key={widget.type}
                  className="cursor-pointer hover:bg-accent transition-colors"
                  onClick={() => addWidget(widget.type)}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{widget.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-xs text-muted-foreground">
                      {widget.type === 'deadlines' && 'View upcoming project and permit deadlines'}
                      {widget.type === 'todos' && 'Manage your personal tasks and assignments'}
                      {widget.type === 'projects' && 'Overview of your active projects'}
                      {widget.type === 'metrics' && 'Key performance indicators and stats'}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="dashboard">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {widgets.map((widget, index) => (
                <Draggable key={widget.id} draggableId={widget.id} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={getWidgetClassName(widget.size)}
                    >
                      <DashboardTile
                        id={widget.id}
                        title={widget.title}
                        onRemove={removeWidget}
                        dragHandleProps={provided.dragHandleProps}
                        isDragging={snapshot.isDragging}
                      >
                        {renderWidget(widget)}
                      </DashboardTile>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {widgets.length === 0 && (
        <Card className="text-center py-8">
          <CardContent>
            <Settings className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Customize Your Dashboard</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Add widgets to see your most important information at a glance
            </p>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Widget
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
import React, { useState, KeyboardEvent } from 'react';
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from '@hello-pangea/dnd';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Calendar, User } from 'lucide-react';
import { format } from 'date-fns';

type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done';
type TaskPriority = 'critical' | 'high' | 'medium' | 'low';

interface KanbanTask {
  id: string;
  title: string;
  status: TaskStatus;
  assignee: string;
  priority: TaskPriority;
  due_date: string;
}

interface TaskKanbanBoardProps {
  projectId: string;
}

interface Column {
  id: TaskStatus;
  label: string;
}

const COLUMNS: Column[] = [
  { id: 'todo', label: 'To Do' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'review', label: 'Review' },
  { id: 'done', label: 'Done' },
];

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  critical: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  low: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
};

const COLUMN_HEADER_STYLES: Record<TaskStatus, string> = {
  todo: 'border-t-blue-500',
  in_progress: 'border-t-amber-500',
  review: 'border-t-purple-500',
  done: 'border-t-green-500',
};

const INITIAL_TASKS: KanbanTask[] = [
  {
    id: '1',
    title: 'Review foundation blueprints',
    status: 'todo',
    assignee: 'John Smith',
    priority: 'high',
    due_date: '2026-04-02',
  },
  {
    id: '2',
    title: 'Order concrete materials',
    status: 'todo',
    assignee: 'Maria Garcia',
    priority: 'critical',
    due_date: '2026-03-30',
  },
  {
    id: '3',
    title: 'Electrical rough-in inspection',
    status: 'in_progress',
    assignee: 'Bob Wilson',
    priority: 'high',
    due_date: '2026-04-01',
  },
  {
    id: '4',
    title: 'Update project schedule',
    status: 'in_progress',
    assignee: 'John Smith',
    priority: 'medium',
    due_date: '2026-04-05',
  },
  {
    id: '5',
    title: 'Submit permit application',
    status: 'review',
    assignee: 'Maria Garcia',
    priority: 'high',
    due_date: '2026-04-03',
  },
  {
    id: '6',
    title: 'Site cleanup - Phase 1',
    status: 'done',
    assignee: 'Bob Wilson',
    priority: 'low',
    due_date: '2026-03-28',
  },
  {
    id: '7',
    title: 'Safety training documentation',
    status: 'review',
    assignee: 'John Smith',
    priority: 'medium',
    due_date: '2026-04-04',
  },
  {
    id: '8',
    title: 'Plumbing fixture selection',
    status: 'todo',
    assignee: 'Maria Garcia',
    priority: 'low',
    due_date: '2026-04-10',
  },
];

export const TaskKanbanBoard: React.FC<TaskKanbanBoardProps> = ({ projectId }) => {
  const [tasks, setTasks] = useState<KanbanTask[]>(INITIAL_TASKS);
  const [quickAddValues, setQuickAddValues] = useState<Record<TaskStatus, string>>({
    todo: '',
    in_progress: '',
    review: '',
    done: '',
  });

  const getColumnTasks = (status: TaskStatus): KanbanTask[] => {
    return tasks.filter((task) => task.status === status);
  };

  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const newStatus = destination.droppableId as TaskStatus;

    setTasks((prevTasks) => {
      const updated = prevTasks.map((task) =>
        task.id === draggableId ? { ...task, status: newStatus } : task
      );

      // Reorder within the destination column
      const columnTasks = updated.filter((t) => t.status === newStatus);
      const movedTask = columnTasks.find((t) => t.id === draggableId);
      if (!movedTask) return updated;

      const otherColumnTasks = columnTasks.filter((t) => t.id !== draggableId);
      const reordered = [
        ...otherColumnTasks.slice(0, destination.index),
        movedTask,
        ...otherColumnTasks.slice(destination.index),
      ];

      const otherTasks = updated.filter((t) => t.status !== newStatus);
      return [...otherTasks, ...reordered];
    });
  };

  const handleQuickAdd = (status: TaskStatus) => {
    const title = quickAddValues[status].trim();
    if (!title) return;

    const newTask: KanbanTask = {
      id: `task-${Date.now()}`,
      title,
      status,
      assignee: 'Unassigned',
      priority: 'medium',
      due_date: format(new Date(), 'yyyy-MM-dd'),
    };

    setTasks((prev) => [...prev, newTask]);
    setQuickAddValues((prev) => ({ ...prev, [status]: '' }));
  };

  const handleQuickAddKeyDown = (
    e: KeyboardEvent<HTMLInputElement>,
    status: TaskStatus
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleQuickAdd(status);
    }
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {COLUMNS.map((column) => {
          const columnTasks = getColumnTasks(column.id);

          return (
            <div key={column.id} className="flex flex-col">
              <Card
                className={`flex flex-col flex-1 border-t-4 ${COLUMN_HEADER_STYLES[column.id]}`}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center justify-between">
                    {column.label}
                    <Badge variant="secondary">{columnTasks.length}</Badge>
                  </CardTitle>
                </CardHeader>

                <Droppable droppableId={column.id}>
                  {(provided, snapshot) => (
                    <CardContent
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-1 space-y-2 min-h-[120px] transition-colors ${
                        snapshot.isDraggingOver
                          ? 'bg-accent/50 rounded-md'
                          : ''
                      }`}
                    >
                      {columnTasks.map((task, index) => (
                        <Draggable
                          key={task.id}
                          draggableId={task.id}
                          index={index}
                        >
                          {(draggableProvided, draggableSnapshot) => (
                            <Card
                              ref={draggableProvided.innerRef}
                              {...draggableProvided.draggableProps}
                              {...draggableProvided.dragHandleProps}
                              className={`cursor-grab active:cursor-grabbing transition-shadow ${
                                draggableSnapshot.isDragging
                                  ? 'shadow-lg ring-2 ring-primary/20'
                                  : 'hover:shadow-md'
                              }`}
                            >
                              <CardContent className="p-3 space-y-2">
                                <p className="text-sm font-medium leading-tight">
                                  {task.title}
                                </p>

                                <div className="flex items-center justify-between">
                                  <Badge
                                    className={PRIORITY_STYLES[task.priority]}
                                  >
                                    {task.priority}
                                  </Badge>
                                </div>

                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                  <div className="flex items-center gap-1">
                                    <User className="h-3 w-3" />
                                    <span className="truncate max-w-[80px]">
                                      {task.assignee}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    <span>
                                      {format(new Date(task.due_date), 'MMM d')}
                                    </span>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </CardContent>
                  )}
                </Droppable>

                <div className="p-3 pt-0">
                  <div className="flex gap-1">
                    <Input
                      placeholder="Add a task..."
                      value={quickAddValues[column.id]}
                      onChange={(e) =>
                        setQuickAddValues((prev) => ({
                          ...prev,
                          [column.id]: e.target.value,
                        }))
                      }
                      onKeyDown={(e) => handleQuickAddKeyDown(e, column.id)}
                      className="text-sm h-8"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 shrink-0"
                      onClick={() => handleQuickAdd(column.id)}
                      disabled={!quickAddValues[column.id].trim()}
                      aria-label={`Add task to ${column.label}`}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
};

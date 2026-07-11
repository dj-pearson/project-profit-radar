import React, { useMemo, useState } from 'react';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Calendar } from 'lucide-react';
import {
  groupTasksByStage, statusValueForStage, assigneeInitials, type BoardTask,
} from '@/lib/tasks/taskBoard';

interface TaskBoardProps {
  tasks: BoardTask[];
  /** Persist a status change (writes tasks.status). */
  onStatusChange: (taskId: string, statusValue: string) => void | Promise<void>;
  onTaskClick?: (taskId: string) => void;
  /** Quick-add a task to a stage. Return value is awaited; resolve after refresh. */
  onQuickAdd?: (title: string, statusValue: string) => void | Promise<void>;
}

const PRIORITY_VARIANT: Record<string, string> = {
  urgent: 'bg-red-100 text-red-800',
  high: 'bg-orange-100 text-orange-800',
  medium: 'bg-yellow-100 text-yellow-800',
  low: 'bg-slate-100 text-slate-700',
};

export const TaskBoard: React.FC<TaskBoardProps> = ({ tasks, onStatusChange, onTaskClick, onQuickAdd }) => {
  const [optimistic, setOptimistic] = useState<Record<string, string>>({});
  const [quickAdd, setQuickAdd] = useState<Record<string, string>>({});

  const effectiveTasks = useMemo(
    () => tasks.map((t) => (optimistic[t.id] ? { ...t, status: optimistic[t.id] } : t)),
    [tasks, optimistic]
  );
  const columns = useMemo(() => groupTasksByStage(effectiveTasks), [effectiveTasks]);

  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination || destination.droppableId === source.droppableId) return;
    const statusValue = statusValueForStage(destination.droppableId);
    setOptimistic((prev) => ({ ...prev, [draggableId]: statusValue }));
    Promise.resolve(onStatusChange(draggableId, statusValue)).catch(() => {
      setOptimistic((prev) => {
        const next = { ...prev };
        delete next[draggableId];
        return next;
      });
    });
  };

  const submitQuickAdd = async (stageKey: string) => {
    const title = (quickAdd[stageKey] ?? '').trim();
    if (!title || !onQuickAdd) return;
    setQuickAdd((prev) => ({ ...prev, [stageKey]: '' }));
    await onQuickAdd(title, statusValueForStage(stageKey));
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4" role="list" aria-label="Task board columns">
        {columns.map((column) => (
          <div key={column.key} className="flex-shrink-0 w-72" role="listitem">
            <div className="flex items-center justify-between mb-2 px-1">
              <h3 className="font-semibold text-sm">{column.label}</h3>
              <Badge variant="secondary">{column.count}</Badge>
            </div>
            <Droppable droppableId={column.key}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`space-y-2 rounded-md p-2 min-h-[120px] transition-colors ${
                    snapshot.isDraggingOver ? 'bg-muted/60' : 'bg-muted/20'
                  }`}
                >
                  {column.tasks.map((task, index) => (
                    <Draggable key={task.id} draggableId={task.id} index={index}>
                      {(dragProvided, dragSnapshot) => (
                        <Card
                          ref={dragProvided.innerRef}
                          {...dragProvided.draggableProps}
                          {...dragProvided.dragHandleProps}
                          onClick={() => onTaskClick?.(task.id)}
                          className={`cursor-pointer ${dragSnapshot.isDragging ? 'shadow-lg' : ''}`}
                        >
                          <CardContent className="p-3 space-y-2">
                            <div className="text-sm font-medium leading-snug">{task.name || 'Untitled task'}</div>
                            <div className="flex items-center justify-between">
                              {task.priority ? (
                                <Badge className={`text-[10px] ${PRIORITY_VARIANT[task.priority.toLowerCase()] ?? 'bg-slate-100 text-slate-700'}`}>
                                  {task.priority}
                                </Badge>
                              ) : <span />}
                              {task.assigned_user && (
                                <Avatar className="h-6 w-6">
                                  <AvatarFallback className="text-[10px]">
                                    {assigneeInitials(task.assigned_user)}
                                  </AvatarFallback>
                                </Avatar>
                              )}
                            </div>
                            {task.due_date && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Calendar className="h-3 w-3" aria-hidden="true" />
                                {new Date(task.due_date).toLocaleDateString()}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
            {onQuickAdd && (
              <div className="mt-2 px-1">
                <Input
                  value={quickAdd[column.key] ?? ''}
                  onChange={(e) => setQuickAdd((prev) => ({ ...prev, [column.key]: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submitQuickAdd(column.key); } }}
                  placeholder="+ Add task"
                  aria-label={`Quick add task to ${column.label}`}
                  className="h-8 text-sm"
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </DragDropContext>
  );
};

export default TaskBoard;

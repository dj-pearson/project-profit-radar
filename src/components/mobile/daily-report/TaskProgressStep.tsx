import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, X, Plus } from 'lucide-react';
import React from 'react';
import type { DailyReportData, TaskProgress } from './types';
import { getTaskStatusColor } from './reportColors';

interface TaskProgressStepProps {
  newTask: TaskProgress;
  setNewTask: React.Dispatch<React.SetStateAction<TaskProgress>>;
  addTask: () => void;
  removeTask: (index: number) => void;
  reportData: DailyReportData;
}

/** Step 3 of the mobile daily report: per-task planned vs actual completion. */
export function TaskProgressStep({ newTask, setNewTask, addTask, removeTask, reportData }: TaskProgressStepProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5" />
          Task Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 border rounded-lg bg-muted/50 space-y-4">
          <div>
            <Label>Task Name</Label>
            <Input
              value={newTask.task_name}
              onChange={(e) => setNewTask(prev => ({ ...prev, task_name: e.target.value }))}
              placeholder="Task or activity name"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Planned (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={newTask.planned_completion}
                onChange={(e) => setNewTask(prev => ({ 
                  ...prev, 
                  planned_completion: parseInt(e.target.value) || 0 
                }))}
              />
            </div>
            <div>
              <Label>Actual (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={newTask.actual_completion}
                onChange={(e) => setNewTask(prev => ({ 
                  ...prev, 
                  actual_completion: parseInt(e.target.value) || 0 
                }))}
              />
            </div>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={newTask.status} onValueChange={(value) => 
              setNewTask(prev => ({ ...prev, status: value as TaskProgress['status'] }))
            }>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ahead">Ahead of Schedule</SelectItem>
                <SelectItem value="on_track">On Track</SelectItem>
                <SelectItem value="behind">Behind Schedule</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea
              value={newTask.notes || ''}
              onChange={(e) => setNewTask(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional notes..."
              rows={2}
            />
          </div>
          <Button
            onClick={addTask}
            disabled={!newTask.task_name}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Task
          </Button>
        </div>

        {reportData.task_progress.map((task, index) => (
          <div key={index} className="flex items-center justify-between p-3 bg-background border rounded">
            <div className="flex-1">
              <div className="font-medium">{task.task_name}</div>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={getTaskStatusColor(task.status)}>
                  {task.status.replace('_', ' ')}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {task.actual_completion}% complete
                </span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removeTask(index)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

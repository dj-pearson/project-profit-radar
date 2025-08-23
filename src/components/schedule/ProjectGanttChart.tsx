import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  ReactFlow, 
  Node, 
  Edge, 
  Controls, 
  Background, 
  useNodesState, 
  useEdgesState,
  addEdge,
  Connection
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Calendar, Users, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Task {
  id: string;
  name: string;
  start_date?: string;
  end_date?: string;
  duration_days?: number;
  assigned_to?: string;
  status: string;
  priority: string;
  completion_percentage: number;
  is_milestone?: boolean;
  is_critical_path?: boolean;
  project_id: string;
}

interface TaskDependency {
  id: string;
  predecessor_task_id: string;
  successor_task_id: string;
  dependency_type: string;
  lag_days: number;
}

interface ProjectGanttChartProps {
  projects: any[];
  onDateRangeChange: (startDate: Date, endDate: Date, projectId: string) => void;
  selectedYear: number;
}

const ProjectGanttChart: React.FC<ProjectGanttChartProps> = ({ 
  projects, 
  onDateRangeChange, 
  selectedYear 
}) => {
  const { userProfile } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [dependencies, setDependencies] = useState<TaskDependency[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Create timeline scale
  const timelineStart = useMemo(() => {
    return new Date(selectedYear, 0, 1);
  }, [selectedYear]);

  const timelineEnd = useMemo(() => {
    return new Date(selectedYear, 11, 31);
  }, [selectedYear]);

  const getDaysFromStart = (date: string) => {
    const taskDate = new Date(date);
    const diffTime = taskDate.getTime() - timelineStart.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getDateFromDays = (days: number) => {
    const date = new Date(timelineStart);
    date.setDate(date.getDate() + days);
    return date;
  };

  // Convert tasks to nodes for ReactFlow
  const createTaskNodes = useCallback((tasks: Task[]): Node[] => {
    return tasks.map((task, index) => {
      const startX = task.start_date ? getDaysFromStart(task.start_date) * 3 : 100; // 3px per day
      const duration = task.duration_days || 1;
      const width = Math.max(duration * 3, 80); // Minimum width of 80px
      const y = index * 80 + 50;

      return {
        id: task.id,
        type: 'taskNode',
        position: { x: startX, y },
        data: {
          task,
          width,
          duration,
          onTaskUpdate: handleTaskUpdate,
        },
        style: {
          width,
          height: 60,
          background: getTaskBackground(task),
          border: task.is_critical_path ? '2px solid #ef4444' : '1px solid #e2e8f0',
          borderRadius: '6px',
        },
        draggable: true,
      };
    });
  }, [timelineStart]);

  // Convert dependencies to edges
  const createDependencyEdges = useCallback((dependencies: TaskDependency[]): Edge[] => {
    return dependencies.map((dep) => ({
      id: dep.id,
      source: dep.predecessor_task_id,
      target: dep.successor_task_id,
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#8b5cf6', strokeWidth: 2 },
      label: dep.dependency_type.replace('_', '-'),
      labelBgStyle: { fill: '#fafafa', fillOpacity: 0.8 },
    }));
  }, []);

  const getTaskBackground = (task: Task) => {
    if (task.is_milestone) return '#fbbf24';
    if (task.is_critical_path) return '#fca5a5';
    
    const completion = task.completion_percentage;
    if (completion === 100) return '#86efac';
    if (completion > 50) return '#bfdbfe';
    if (completion > 0) return '#fed7aa';
    return '#e2e8f0';
  };

  const fetchProjectTasks = async (projectId: string) => {
    if (!projectId || !userProfile?.company_id) return;

    try {
      setLoading(true);
      
      // Fetch tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', projectId)
        .eq('company_id', userProfile.company_id)
        .order('created_at');

      if (tasksError) throw tasksError;

      // Fetch task dependencies
      const { data: depsData, error: depsError } = await supabase
        .from('task_dependencies')
        .select('*')
        .eq('company_id', userProfile.company_id)
        .eq('is_active', true);

      if (depsError) throw depsError;

      setTasks(tasksData || []);
      setDependencies(depsData || []);

      // Create nodes and edges
      const taskNodes = createTaskNodes(tasksData || []);
      const depEdges = createDependencyEdges(depsData || []);
      
      setNodes(taskNodes);
      setEdges(depEdges);

    } catch (error) {
      console.error('Error fetching project tasks:', error);
      toast.error('Failed to load project tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleTaskUpdate = async (taskId: string, updates: Partial<Task>) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId);

      if (error) throw error;

      // Refresh tasks
      fetchProjectTasks(selectedProject);
      toast.success('Task updated successfully');
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Failed to update task');
    }
  };

  const handleNodeDragStop = useCallback((event: any, node: Node) => {
    const newStartDays = Math.round(node.position.x / 3);
    const newStartDate = getDateFromDays(newStartDays);
    const task = tasks.find(t => t.id === node.id);
    
    if (task && task.duration_days) {
      const newEndDate = new Date(newStartDate);
      newEndDate.setDate(newEndDate.getDate() + task.duration_days - 1);
      
      handleTaskUpdate(node.id, {
        start_date: newStartDate.toISOString().split('T')[0],
        end_date: newEndDate.toISOString().split('T')[0],
      });
    }
  }, [tasks]);

  const onConnect = useCallback(
    (params: Connection) => {
      if (params.source && params.target) {
        createTaskDependency(params.source, params.target);
      }
    },
    []
  );

  const createTaskDependency = async (predecessorId: string, successorId: string) => {
    if (!userProfile?.company_id) return;

    try {
      const { error } = await supabase
        .from('task_dependencies')
        .insert({
          company_id: userProfile.company_id,
          predecessor_task_id: predecessorId,
          successor_task_id: successorId,
          dependency_type: 'finish_to_start',
          lag_days: 0,
        });

      if (error) throw error;

      // Refresh tasks and dependencies
      fetchProjectTasks(selectedProject);
      toast.success('Task dependency created');
    } catch (error) {
      console.error('Error creating dependency:', error);
      toast.error('Failed to create dependency');
    }
  };

  const calculateCriticalPath = async () => {
    if (!selectedProject) return;

    try {
      const { data, error } = await supabase.rpc('calculate_critical_path', {
        p_project_id: selectedProject
      });

      if (error) throw error;
      
      console.log('Critical path:', data);
      toast.success('Critical path calculated');
    } catch (error) {
      console.error('Error calculating critical path:', error);
      toast.error('Failed to calculate critical path');
    }
  };

  useEffect(() => {
    if (selectedProject) {
      fetchProjectTasks(selectedProject);
    }
  }, [selectedProject]);

  useEffect(() => {
    if (projects.length > 0 && !selectedProject) {
      setSelectedProject(projects[0].id);
    }
  }, [projects]);

  // Custom task node component
  const TaskNode = ({ data }: { data: any }) => {
    const { task, width, onTaskUpdate } = data;
    
    return (
      <div 
        className="task-node p-2 text-xs border rounded cursor-pointer"
        style={{ width: `${width}px`, minHeight: '60px' }}
      >
        <div className="font-semibold truncate mb-1">{task.name}</div>
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="text-xs">
            {task.status}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {task.completion_percentage}%
          </span>
        </div>
        {task.is_milestone && (
          <Badge variant="secondary" className="text-xs mt-1">
            Milestone
          </Badge>
        )}
      </div>
    );
  };

  const nodeTypes = {
    taskNode: TaskNode,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="px-3 py-2 border border-input rounded-md bg-background"
          >
            <option value="">Select Project</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          
          {tasks.length > 0 && (
            <Badge variant="outline">
              {tasks.length} Tasks
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={calculateCriticalPath}
            disabled={!selectedProject}
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            Critical Path
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchProjectTasks(selectedProject)}
            disabled={!selectedProject}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Timeline Header */}
      <div className="border-b pb-2">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold">Timeline View - {selectedYear}</h3>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-red-200 border border-red-400"></div>
              <span>Critical Path</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-yellow-400"></div>
              <span>Milestone</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-green-200"></div>
              <span>Complete</span>
            </div>
          </div>
        </div>
      </div>

      {/* Gantt Chart */}
      <div className="border rounded-lg" style={{ height: '600px' }}>
        {selectedProject ? (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeDragStop={handleNodeDragStop}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 20 }}
          >
            <Controls />
            <Background color="#f1f5f9" gap={20} />
          </ReactFlow>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Select a project to view the Gantt chart
          </div>
        )}
      </div>

      {/* Legend & Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Gantt Chart Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• Drag tasks horizontally to change start dates</p>
          <p>• Connect tasks by dragging from one task to another to create dependencies</p>
          <p>• Critical path tasks are highlighted in red</p>
          <p>• Milestones are shown in yellow</p>
          <p>• Task completion is indicated by color (green = complete, blue = in progress, gray = not started)</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProjectGanttChart;
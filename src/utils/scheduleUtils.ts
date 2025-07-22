import { Task, Project, CriticalPath, ScheduleConflict, PROJECT_TEMPLATES, TemplateType } from '@/types/schedule';

// Critical Path Method (CPM) calculation
export function calculateCriticalPath(tasks: Task[]): CriticalPath {
  // Create a map for quick task lookup
  const taskMap = new Map(tasks.map(task => [task.id, task]));
  
  // Calculate Early Start (ES) and Early Finish (EF) - Forward Pass
  const forwardPass = (task: Task, visited = new Set<string>()): { es: number, ef: number } => {
    if (visited.has(task.id)) {
      throw new Error(`Circular dependency detected involving task ${task.id}`);
    }
    visited.add(task.id);
    
    let maxES = 0;
    
    // Find the maximum EF of all dependencies
    for (const depId of task.dependencies) {
      const depTask = taskMap.get(depId);
      if (depTask) {
        const depResult = forwardPass(depTask, new Set(visited));
        maxES = Math.max(maxES, depResult.ef);
      }
    }
    
    const es = maxES;
    const ef = es + task.duration;
    
    return { es, ef };
  };
  
  // Calculate forward pass for all tasks
  const taskSchedule = new Map<string, { es: number, ef: number, ls: number, lf: number }>();
  let projectFinish = 0;
  
  for (const task of tasks) {
    const { es, ef } = forwardPass(task);
    taskSchedule.set(task.id, { es, ef, ls: 0, lf: 0 });
    projectFinish = Math.max(projectFinish, ef);
  }
  
  // Calculate Late Start (LS) and Late Finish (LF) - Backward Pass
  const backwardPass = (task: Task): { ls: number, lf: number } => {
    const schedule = taskSchedule.get(task.id)!;
    
    // Find tasks that depend on this task
    const dependents = tasks.filter(t => t.dependencies.includes(task.id));
    
    let minLF = projectFinish;
    if (dependents.length > 0) {
      minLF = Math.min(...dependents.map(dep => {
        const depSchedule = taskSchedule.get(dep.id)!;
        return depSchedule.ls;
      }));
    }
    
    const lf = minLF;
    const ls = lf - task.duration;
    
    schedule.ls = ls;
    schedule.lf = lf;
    
    return { ls, lf };
  };
  
  // Calculate backward pass for all tasks (in reverse topological order)
  const processedTasks = new Set<string>();
  const processTask = (task: Task) => {
    if (processedTasks.has(task.id)) return;
    
    // Process all dependents first
    const dependents = tasks.filter(t => t.dependencies.includes(task.id));
    for (const dependent of dependents) {
      processTask(dependent);
    }
    
    backwardPass(task);
    processedTasks.add(task.id);
  };
  
  // Find tasks with no dependents (end tasks) and work backwards
  const endTasks = tasks.filter(task => 
    !tasks.some(t => t.dependencies.includes(task.id))
  );
  
  for (const endTask of endTasks) {
    processTask(endTask);
  }
  
  // Find critical path tasks (where ES = LS and EF = LF)
  const criticalTasks = tasks.filter(task => {
    const schedule = taskSchedule.get(task.id)!;
    return schedule.es === schedule.ls && schedule.ef === schedule.lf;
  });
  
  // Calculate project dates
  const startDate = new Date();
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + projectFinish);
  
  return {
    tasks: criticalTasks,
    totalDuration: projectFinish,
    startDate,
    endDate
  };
}

// Generate tasks from template
export function generateTasksFromTemplate(templateType: TemplateType, projectStartDate: Date): Task[] {
  const template = PROJECT_TEMPLATES[templateType];
  const tasks: Task[] = [];
  
  let currentDate = new Date(projectStartDate);
  let taskIdCounter = 1;
  
  for (const phase of template.phases.sort((a, b) => a.order - b.order)) {
    const phaseStartDate = new Date(currentDate);
    
    // Create main phase task
    const phaseTask: Task = {
      id: `task-${taskIdCounter++}`,
      name: phase.name,
      duration: phase.estimatedDuration,
      startDate: phaseStartDate,
      endDate: new Date(phaseStartDate.getTime() + phase.estimatedDuration * 24 * 60 * 60 * 1000),
      dependencies: phase.dependencies.map(depName => 
        tasks.find(t => t.name.includes(depName))?.id || ''
      ).filter(Boolean),
      resourceId: 'general-contractor',
      status: 'not-started',
      isOnCriticalPath: false, // Will be calculated later
      phase: phase.name,
      description: phase.description
    };
    
    tasks.push(phaseTask);
    
    // Generate sub-tasks based on phase type
    const subTasks = generateSubTasksForPhase(phase, phaseTask, taskIdCounter);
    tasks.push(...subTasks);
    taskIdCounter += subTasks.length;
    
    // Update current date for next phase
    currentDate = new Date(phaseTask.endDate);
  }
  
  // Calculate critical path
  const criticalPath = calculateCriticalPath(tasks);
  
  // Update critical path flags
  tasks.forEach(task => {
    task.isOnCriticalPath = criticalPath.tasks.some(ct => ct.id === task.id);
  });
  
  return tasks;
}

// Generate sub-tasks for specific phases
function generateSubTasksForPhase(phase: any, parentTask: Task, startId: number): Task[] {
  const subTasks: Task[] = [];
  const phaseDuration = phase.estimatedDuration;
  const subTaskCount = Math.ceil(phaseDuration / 3); // Roughly 3 days per sub-task
  
  for (let i = 0; i < subTaskCount; i++) {
    const subTaskDuration = Math.min(3, phaseDuration - (i * 3));
    if (subTaskDuration <= 0) break;
    
    const startDate = new Date(parentTask.startDate);
    startDate.setDate(startDate.getDate() + (i * 3));
    
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + subTaskDuration);
    
    const subTask: Task = {
      id: `task-${startId + i}`,
      name: `${phase.name} - Step ${i + 1}`,
      duration: subTaskDuration,
      startDate,
      endDate,
      dependencies: i === 0 ? parentTask.dependencies : [`task-${startId + i - 1}`],
      resourceId: getResourceForPhase(phase.name),
      status: 'not-started',
      isOnCriticalPath: false,
      phase: phase.name,
      description: `${phase.description} - Step ${i + 1}`
    };
    
    subTasks.push(subTask);
  }
  
  return subTasks;
}

// Get appropriate resource type for phase
function getResourceForPhase(phaseName: string): string {
  const phaseResourceMap: Record<string, string> = {
    'Site Preparation': 'excavation-crew',
    'Foundation': 'concrete-crew',
    'Framing': 'framing-crew',
    'MEP Rough-In': 'electrical-contractor',
    'Insulation': 'general-contractor',
    'Drywall': 'drywall-crew',
    'Flooring': 'flooring-crew',
    'Painting': 'painting-crew',
    'MEP Finish': 'electrical-contractor',
    'Planning': 'general-contractor',
    'Demolition': 'general-contractor'
  };
  
  return phaseResourceMap[phaseName] || 'general-contractor';
}

// Check for schedule conflicts
export function detectScheduleConflicts(tasks: Task[]): ScheduleConflict[] {
  const conflicts: ScheduleConflict[] = [];
  
  // Check for resource conflicts
  const resourceSchedule = new Map<string, Task[]>();
  
  tasks.forEach(task => {
    if (!resourceSchedule.has(task.resourceId)) {
      resourceSchedule.set(task.resourceId, []);
    }
    resourceSchedule.get(task.resourceId)!.push(task);
  });
  
  resourceSchedule.forEach((tasksForResource, resourceId) => {
    // Sort tasks by start date
    const sortedTasks = tasksForResource.sort((a, b) => 
      a.startDate.getTime() - b.startDate.getTime()
    );
    
    for (let i = 0; i < sortedTasks.length - 1; i++) {
      const currentTask = sortedTasks[i];
      const nextTask = sortedTasks[i + 1];
      
      if (currentTask.endDate > nextTask.startDate) {
        conflicts.push({
          id: `conflict-${conflicts.length + 1}`,
          type: 'resource-conflict',
          description: `Resource ${resourceId} is double-booked between "${currentTask.name}" and "${nextTask.name}"`,
          affectedTasks: [currentTask.id, nextTask.id],
          severity: 'high',
          suggestedResolution: `Adjust start date of "${nextTask.name}" to ${currentTask.endDate.toLocaleDateString()}`
        });
      }
    }
  });
  
  // Check for circular dependencies
  const visitedInPath = new Set<string>();
  const visitedGlobal = new Set<string>();
  
  const hasCycle = (taskId: string, taskMap: Map<string, Task>): boolean => {
    if (visitedInPath.has(taskId)) return true;
    if (visitedGlobal.has(taskId)) return false;
    
    visitedInPath.add(taskId);
    visitedGlobal.add(taskId);
    
    const task = taskMap.get(taskId);
    if (task) {
      for (const depId of task.dependencies) {
        if (hasCycle(depId, taskMap)) return true;
      }
    }
    
    visitedInPath.delete(taskId);
    return false;
  };
  
  const taskMap = new Map(tasks.map(task => [task.id, task]));
  
  for (const task of tasks) {
    visitedInPath.clear();
    if (hasCycle(task.id, taskMap)) {
      conflicts.push({
        id: `conflict-${conflicts.length + 1}`,
        type: 'dependency-cycle',
        description: `Circular dependency detected involving task "${task.name}"`,
        affectedTasks: [task.id],
        severity: 'high',
        suggestedResolution: 'Review and remove circular dependencies'
      });
    }
  }
  
  return conflicts;
}

// Update task dates based on dependencies
export function updateTaskDates(task: Task, newStartDate: Date, allTasks: Task[]): Task {
  const duration = task.duration;
  const newEndDate = new Date(newStartDate);
  newEndDate.setDate(newEndDate.getDate() + duration);
  
  return {
    ...task,
    startDate: newStartDate,
    endDate: newEndDate
  };
}

// Get tasks that depend on a given task
export function getDependentTasks(taskId: string, allTasks: Task[]): Task[] {
  return allTasks.filter(task => task.dependencies.includes(taskId));
}

// Calculate project completion percentage
export function calculateProjectProgress(tasks: Task[]): number {
  if (tasks.length === 0) return 0;
  
  const completedTasks = tasks.filter(task => task.status === 'completed').length;
  const inProgressTasks = tasks.filter(task => task.status === 'in-progress').length;
  
  // Weight in-progress tasks as 50% complete
  const weightedComplete = completedTasks + (inProgressTasks * 0.5);
  
  return Math.round((weightedComplete / tasks.length) * 100);
}

// Format duration for display
export function formatDuration(days: number): string {
  if (days < 7) {
    return `${days} day${days !== 1 ? 's' : ''}`;
  } else if (days < 30) {
    const weeks = Math.floor(days / 7);
    const remainingDays = days % 7;
    if (remainingDays === 0) {
      return `${weeks} week${weeks !== 1 ? 's' : ''}`;
    } else {
      return `${weeks}w ${remainingDays}d`;
    }
  } else {
    const months = Math.floor(days / 30);
    const remainingDays = days % 30;
    if (remainingDays === 0) {
      return `${months} month${months !== 1 ? 's' : ''}`;
    } else {
      return `${months}m ${remainingDays}d`;
    }
  }
}

// Generate sample project data
export function createSampleProject(templateType: TemplateType, projectName: string, startDate: Date): Project {
  const tasks = generateTasksFromTemplate(templateType, startDate);
  const endDate = new Date(Math.max(...tasks.map(t => t.endDate.getTime())));
  
  return {
    id: `project-${Date.now()}`,
    name: projectName,
    template: templateType,
    startDate,
    endDate,
    tasks,
    createdAt: new Date()
  };
} 
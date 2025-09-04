import { supabase } from "@/integrations/supabase/client";

export interface ConstructionDependency {
  prerequisite_task: string;
  dependent_task: string;
  dependency_type:
    | "finish_to_start"
    | "inspection_required"
    | "material_delivery"
    | "weather_dependent";
  lead_time_days: number;
  buffer_time_hours: number;
}

export interface ValidationResult {
  task_id: string;
  task_name: string;
  is_valid: boolean;
  issues: ValidationIssue[];
  recommendations: string[];
}

export interface ValidationIssue {
  type: "missing_dependency" | "scheduling_conflict" | "inspection_gap" | "resource_conflict";
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  affected_tasks: string[];
}

export interface InspectionSchedule {
  inspection_id: string;
  inspection_type: string;
  required_for_phase: string;
  optimal_date: Date;
  inspector_contact?: any;
  prerequisites_met: boolean;
  auto_scheduled: boolean;
}

export interface OptimizedSchedule {
  project_id: string;
  optimizations_applied: ScheduleOptimization[];
  estimated_time_saved: number; // in days
  critical_path_improved: boolean;
  new_completion_date: Date;
}

export interface ScheduleOptimization {
  type: "parallel_execution" | "dependency_optimization" | "resource_leveling" | "critical_path_adjustment";
  description: string;
  tasks_affected: string[];
  time_impact: number; // in days
}

export interface ScheduleConflict {
  conflict_id: string;
  conflict_type: "resource_overlap" | "dependency_violation" | "inspection_gap" | "weather_conflict";
  severity: "low" | "medium" | "high" | "critical";
  affected_tasks: string[];
  suggested_resolution: string;
  auto_resolvable: boolean;
}

// Construction phase rules and dependencies
export const CONSTRUCTION_RULES = {
  foundation: {
    prerequisites: ["site_prep", "excavation", "building_permit"],
    inspections_required: ["footing_inspection", "foundation_inspection"],
    weather_sensitive: true,
    min_cure_time_days: 7,
    typical_duration_days: 5,
    cannot_overlap_with: [],
    required_before: ["framing"]
  },
  framing: {
    prerequisites: ["foundation_inspection_passed"],
    inspections_required: ["framing_inspection"],
    weather_sensitive: true,
    typical_duration_days: 10,
    cannot_overlap_with: [],
    required_before: ["electrical_rough", "plumbing_rough", "hvac_rough"]
  },
  electrical_rough: {
    prerequisites: ["framing_inspection_passed"],
    inspections_required: ["electrical_rough_inspection"],
    cannot_overlap_with: ["plumbing_rough", "hvac_rough"],
    weather_sensitive: false,
    typical_duration_days: 3,
    required_before: ["insulation", "drywall"]
  },
  plumbing_rough: {
    prerequisites: ["framing_inspection_passed"],
    inspections_required: ["plumbing_rough_inspection"],
    cannot_overlap_with: ["electrical_rough", "hvac_rough"],
    weather_sensitive: false,
    typical_duration_days: 3,
    required_before: ["insulation", "drywall"]
  },
  hvac_rough: {
    prerequisites: ["framing_inspection_passed"],
    inspections_required: ["hvac_rough_inspection"],
    cannot_overlap_with: ["electrical_rough", "plumbing_rough"],
    weather_sensitive: false,
    typical_duration_days: 4,
    required_before: ["insulation", "drywall"]
  },
  insulation: {
    prerequisites: ["electrical_rough_inspection_passed", "plumbing_rough_inspection_passed", "hvac_rough_inspection_passed"],
    inspections_required: ["insulation_inspection"],
    weather_sensitive: false,
    typical_duration_days: 2,
    required_before: ["drywall"]
  },
  drywall: {
    prerequisites: ["insulation_inspection_passed"],
    inspections_required: [],
    weather_sensitive: false,
    typical_duration_days: 5,
    required_before: ["painting", "flooring"]
  },
  painting: {
    prerequisites: ["drywall_complete"],
    inspections_required: [],
    weather_sensitive: true,
    typical_duration_days: 3,
    required_before: ["final_walkthrough"]
  },
  flooring: {
    prerequisites: ["drywall_complete", "painting_complete"],
    inspections_required: [],
    weather_sensitive: false,
    typical_duration_days: 4,
    required_before: ["final_walkthrough"]
  },
  final_walkthrough: {
    prerequisites: ["painting_complete", "flooring_complete", "electrical_final", "plumbing_final"],
    inspections_required: ["final_inspection"],
    weather_sensitive: false,
    typical_duration_days: 1,
    required_before: []
  }
};

class ConstructionFlowEngine {
  /**
   * Validate task sequence against construction rules
   */
  async validateTaskSequence(tasks: any[]): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    for (const task of tasks) {
      const validation: ValidationResult = {
        task_id: task.id,
        task_name: task.name,
        is_valid: true,
        issues: [],
        recommendations: []
      };

      const phase = task.construction_phase || task.phase;
      const rules = CONSTRUCTION_RULES[phase as keyof typeof CONSTRUCTION_RULES];

      if (!rules) {
        validation.issues.push({
          type: "missing_dependency",
          severity: "medium",
          description: `No construction rules found for phase: ${phase}`,
          affected_tasks: [task.id]
        });
        validation.is_valid = false;
        results.push(validation);
        continue;
      }

      // Check prerequisites
      for (const prereq of rules.prerequisites) {
        const prerequisiteTask = tasks.find(t => 
          (t.construction_phase === prereq || t.phase === prereq) ||
          t.name.toLowerCase().includes(prereq.replace(/_/g, ' '))
        );

        if (!prerequisiteTask) {
          validation.issues.push({
            type: "missing_dependency",
            severity: "high",
            description: `Missing prerequisite: ${prereq}`,
            affected_tasks: [task.id]
          });
          validation.is_valid = false;
        } else if (prerequisiteTask.end_date > task.start_date) {
          validation.issues.push({
            type: "scheduling_conflict",
            severity: "critical",
            description: `Prerequisite ${prereq} ends after this task starts`,
            affected_tasks: [task.id, prerequisiteTask.id]
          });
          validation.is_valid = false;
        }
      }

      // Check for required inspections
      for (const inspection of rules.inspections_required) {
        validation.recommendations.push(
          `Schedule ${inspection} upon completion of ${phase}`
        );
      }

      // Check overlap constraints
      for (const conflictPhase of rules.cannot_overlap_with) {
        const conflictingTask = tasks.find(t => 
          (t.construction_phase === conflictPhase || t.phase === conflictPhase) &&
          this.tasksOverlap(task, t)
        );

        if (conflictingTask) {
          validation.issues.push({
            type: "scheduling_conflict",
            severity: "high",
            description: `Cannot overlap with ${conflictPhase}`,
            affected_tasks: [task.id, conflictingTask.id]
          });
          validation.is_valid = false;
        }
      }

      // Check weather sensitivity
      if (rules.weather_sensitive && task.weather_sensitive !== true) {
        validation.recommendations.push(
          `Mark task as weather-sensitive for better scheduling`
        );
      }

      results.push(validation);
    }

    return results;
  }

  /**
   * Automatically schedule inspections based on task completion
   */
  async autoScheduleInspections(project_id: string): Promise<InspectionSchedule[]> {
    try {
      // Get project tasks
      const { data: tasks, error: tasksError } = await supabase
        .from("tasks")
        .select("*")
        .eq("project_id", project_id)
        .order("start_date");

      if (tasksError) throw tasksError;

      const inspectionSchedules: InspectionSchedule[] = [];

      for (const task of tasks || []) {
        const phase = task.construction_phase || task.phase;
        const rules = CONSTRUCTION_RULES[phase as keyof typeof CONSTRUCTION_RULES];

        if (!rules || rules.inspections_required.length === 0) continue;

        for (const inspectionType of rules.inspections_required) {
          // Check if inspection already scheduled
          const { data: existingInspection } = await supabase
            .from("inspection_schedule")
            .select("*")
            .eq("project_id", project_id)
            .eq("inspection_type", inspectionType)
            .single();

          if (existingInspection) continue;

          // Calculate optimal inspection date
          const taskEndDate = new Date(task.end_date);
          let optimalDate = new Date(taskEndDate);

          // Add buffer time for inspection scheduling
          if (inspectionType.includes("rough")) {
            optimalDate.setDate(optimalDate.getDate() + 1); // Next day for rough inspections
          } else if (inspectionType.includes("final")) {
            optimalDate.setDate(optimalDate.getDate() + 2); // 2 days for final inspections
          } else {
            optimalDate.setDate(optimalDate.getDate() + 1); // Default 1 day buffer
          }

          // Check prerequisites
          const prerequisitesMet = await this.checkInspectionPrerequisites(
            project_id, 
            inspectionType, 
            rules.prerequisites
          );

          const inspectionSchedule: InspectionSchedule = {
            inspection_id: crypto.randomUUID(),
            inspection_type: inspectionType,
            required_for_phase: phase,
            optimal_date: optimalDate,
            prerequisites_met: prerequisitesMet,
            auto_scheduled: true
          };

          inspectionSchedules.push(inspectionSchedule);

          // Create the inspection schedule in database
          await supabase
            .from("inspection_schedule")
            .insert({
              project_id,
              inspection_type: inspectionType,
              required_for_phase: phase,
              scheduled_date: optimalDate.toISOString().split('T')[0],
              status: "pending",
              auto_scheduled: true,
              notes: `Auto-scheduled for ${phase} completion`
            });
        }
      }

      return inspectionSchedules;
    } catch (error) {
      console.error("Error auto-scheduling inspections:", error);
      throw error;
    }
  }

  /**
   * Optimize trade sequencing for maximum efficiency
   */
  async optimizeTradeSequencing(project_id: string): Promise<OptimizedSchedule> {
    try {
      const { data: tasks, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("project_id", project_id)
        .order("start_date");

      if (error) throw error;

      const optimizations: ScheduleOptimization[] = [];
      let totalTimeSaved = 0;
      let criticalPathImproved = false;

      // Analyze current schedule
      const phases = this.groupTasksByPhase(tasks || []);
      
      // Optimization 1: Parallel execution opportunities
      const parallelOpts = this.findParallelExecutionOpportunities(phases);
      optimizations.push(...parallelOpts);
      totalTimeSaved += parallelOpts.reduce((sum, opt) => sum + opt.time_impact, 0);

      // Optimization 2: Dependency chain optimization
      const dependencyOpts = this.optimizeDependencyChains(phases);
      optimizations.push(...dependencyOpts);
      totalTimeSaved += dependencyOpts.reduce((sum, opt) => sum + opt.time_impact, 0);

      // Optimization 3: Resource leveling
      const resourceOpts = this.optimizeResourceLeveling(tasks || []);
      optimizations.push(...resourceOpts);

      // Calculate new completion date
      const currentCompletionDate = new Date(Math.max(...(tasks || []).map(t => new Date(t.end_date).getTime())));
      const newCompletionDate = new Date(currentCompletionDate);
      newCompletionDate.setDate(newCompletionDate.getDate() - totalTimeSaved);

      criticalPathImproved = totalTimeSaved > 0;

      return {
        project_id,
        optimizations_applied: optimizations,
        estimated_time_saved: totalTimeSaved,
        critical_path_improved: criticalPathImproved,
        new_completion_date: newCompletionDate
      };
    } catch (error) {
      console.error("Error optimizing trade sequencing:", error);
      throw error;
    }
  }

  /**
   * Detect schedule conflicts across the project
   */
  async detectScheduleConflicts(project_id?: string): Promise<ScheduleConflict[]> {
    try {
      let query = supabase
        .from("tasks")
        .select(`
          *,
          project:project_id(name),
          assigned_crew:crew_assignments(*)
        `)
        .order("start_date");

      if (project_id) {
        query = query.eq("project_id", project_id);
      }

      const { data: tasks, error } = await query;
      if (error) throw error;

      const conflicts: ScheduleConflict[] = [];

      // Check for resource overlaps
      const resourceConflicts = this.detectResourceConflicts(tasks || []);
      conflicts.push(...resourceConflicts);

      // Check for dependency violations
      const dependencyConflicts = this.detectDependencyViolations(tasks || []);
      conflicts.push(...dependencyConflicts);

      // Check for inspection gaps
      const inspectionConflicts = await this.detectInspectionGaps(tasks || []);
      conflicts.push(...inspectionConflicts);

      return conflicts;
    } catch (error) {
      console.error("Error detecting schedule conflicts:", error);
      throw error;
    }
  }

  /**
   * Private helper methods
   */
  private tasksOverlap(task1: any, task2: any): boolean {
    const start1 = new Date(task1.start_date);
    const end1 = new Date(task1.end_date);
    const start2 = new Date(task2.start_date);
    const end2 = new Date(task2.end_date);

    return start1 < end2 && start2 < end1;
  }

  private async checkInspectionPrerequisites(
    project_id: string, 
    inspectionType: string, 
    prerequisites: string[]
  ): Promise<boolean> {
    // Check if all prerequisite tasks are completed
    for (const prereq of prerequisites) {
      const { data: task } = await supabase
        .from("tasks")
        .select("status")
        .eq("project_id", project_id)
        .or(`construction_phase.eq.${prereq},phase.eq.${prereq}`)
        .single();

      if (!task || task.status !== "completed") {
        return false;
      }
    }
    return true;
  }

  private groupTasksByPhase(tasks: any[]): Record<string, any[]> {
    return tasks.reduce((groups, task) => {
      const phase = task.construction_phase || task.phase || "unknown";
      if (!groups[phase]) {
        groups[phase] = [];
      }
      groups[phase].push(task);
      return groups;
    }, {});
  }

  private findParallelExecutionOpportunities(phases: Record<string, any[]>): ScheduleOptimization[] {
    const optimizations: ScheduleOptimization[] = [];

    // Check if electrical, plumbing, and HVAC rough-ins can be parallelized
    const electricalRough = phases["electrical_rough"];
    const plumbingRough = phases["plumbing_rough"];
    const hvacRough = phases["hvac_rough"];

    if (electricalRough && plumbingRough && hvacRough) {
      // These trades typically run sequentially but can be parallelized with proper coordination
      const totalSequentialTime = 
        (electricalRough[0]?.duration || 3) + 
        (plumbingRough[0]?.duration || 3) + 
        (hvacRough[0]?.duration || 4);
      
      const parallelTime = Math.max(
        electricalRough[0]?.duration || 3,
        plumbingRough[0]?.duration || 3,
        hvacRough[0]?.duration || 4
      );

      const timeSaved = totalSequentialTime - parallelTime;

      if (timeSaved > 0) {
        optimizations.push({
          type: "parallel_execution",
          description: "Run electrical, plumbing, and HVAC rough-ins in parallel with proper coordination",
          tasks_affected: [
            ...electricalRough.map(t => t.id),
            ...plumbingRough.map(t => t.id),
            ...hvacRough.map(t => t.id)
          ],
          time_impact: timeSaved
        });
      }
    }

    return optimizations;
  }

  private optimizeDependencyChains(phases: Record<string, any[]>): ScheduleOptimization[] {
    const optimizations: ScheduleOptimization[] = [];

    // Look for opportunities to reduce buffer time between dependent tasks
    Object.entries(phases).forEach(([phaseName, tasks]) => {
      const rules = CONSTRUCTION_RULES[phaseName as keyof typeof CONSTRUCTION_RULES];
      if (!rules) return;

      tasks.forEach(task => {
        // Check if there's excessive buffer time before this task
        const bufferTime = this.calculateBufferTime(task, phases);
        if (bufferTime > 2) { // More than 2 days buffer
          optimizations.push({
            type: "dependency_optimization",
            description: `Reduce buffer time for ${phaseName} by ${bufferTime - 1} days`,
            tasks_affected: [task.id],
            time_impact: bufferTime - 1
          });
        }
      });
    });

    return optimizations;
  }

  private optimizeResourceLeveling(tasks: any[]): ScheduleOptimization[] {
    const optimizations: ScheduleOptimization[] = [];

    // Simple resource leveling - identify overallocated resources
    const resourceUsage = new Map();
    
    tasks.forEach(task => {
      const startDate = new Date(task.start_date).toDateString();
      if (!resourceUsage.has(startDate)) {
        resourceUsage.set(startDate, []);
      }
      resourceUsage.get(startDate).push(task);
    });

    resourceUsage.forEach((dayTasks, date) => {
      if (dayTasks.length > 3) { // More than 3 tasks on same day
        optimizations.push({
          type: "resource_leveling",
          description: `Level resources for ${date} - ${dayTasks.length} tasks scheduled`,
          tasks_affected: dayTasks.map((t: any) => t.id),
          time_impact: 0 // Resource leveling may not save time but improves quality
        });
      }
    });

    return optimizations;
  }

  private calculateBufferTime(task: any, phases: Record<string, any[]>): number {
    // Simplified buffer time calculation
    const taskStart = new Date(task.start_date);
    const phase = task.construction_phase || task.phase;
    const rules = CONSTRUCTION_RULES[phase as keyof typeof CONSTRUCTION_RULES];
    
    if (!rules || rules.prerequisites.length === 0) return 0;

    // Find the latest prerequisite end date
    let latestPrereqEnd = new Date(0);
    
    rules.prerequisites.forEach(prereq => {
      const prereqTasks = phases[prereq] || [];
      prereqTasks.forEach(prereqTask => {
        const prereqEnd = new Date(prereqTask.end_date);
        if (prereqEnd > latestPrereqEnd) {
          latestPrereqEnd = prereqEnd;
        }
      });
    });

    if (latestPrereqEnd.getTime() === 0) return 0;

    // Calculate buffer time in days
    const bufferMs = taskStart.getTime() - latestPrereqEnd.getTime();
    return Math.floor(bufferMs / (1000 * 60 * 60 * 24));
  }

  private detectResourceConflicts(tasks: any[]): ScheduleConflict[] {
    const conflicts: ScheduleConflict[] = [];
    
    // Group tasks by date and check for resource overlaps
    const tasksByDate = new Map();
    
    tasks.forEach(task => {
      const dates = this.getDateRange(new Date(task.start_date), new Date(task.end_date));
      dates.forEach(date => {
        const dateKey = date.toDateString();
        if (!tasksByDate.has(dateKey)) {
          tasksByDate.set(dateKey, []);
        }
        tasksByDate.get(dateKey).push(task);
      });
    });

    tasksByDate.forEach((dayTasks, date) => {
      if (dayTasks.length > 2) {
        conflicts.push({
          conflict_id: crypto.randomUUID(),
          conflict_type: "resource_overlap",
          severity: dayTasks.length > 4 ? "high" : "medium",
          affected_tasks: dayTasks.map((t: any) => t.id),
          suggested_resolution: `Stagger task start times or extend duration for ${date}`,
          auto_resolvable: true
        });
      }
    });

    return conflicts;
  }

  private detectDependencyViolations(tasks: any[]): ScheduleConflict[] {
    const conflicts: ScheduleConflict[] = [];

    tasks.forEach(task => {
      const phase = task.construction_phase || task.phase;
      const rules = CONSTRUCTION_RULES[phase as keyof typeof CONSTRUCTION_RULES];
      
      if (!rules) return;

      rules.prerequisites.forEach(prereq => {
        const prereqTask = tasks.find(t => 
          (t.construction_phase === prereq || t.phase === prereq)
        );

        if (prereqTask && new Date(prereqTask.end_date) > new Date(task.start_date)) {
          conflicts.push({
            conflict_id: crypto.randomUUID(),
            conflict_type: "dependency_violation",
            severity: "critical",
            affected_tasks: [task.id, prereqTask.id],
            suggested_resolution: `Move ${phase} start date after ${prereq} completion`,
            auto_resolvable: true
          });
        }
      });
    });

    return conflicts;
  }

  private async detectInspectionGaps(tasks: any[]): Promise<ScheduleConflict[]> {
    const conflicts: ScheduleConflict[] = [];

    for (const task of tasks) {
      const phase = task.construction_phase || task.phase;
      const rules = CONSTRUCTION_RULES[phase as keyof typeof CONSTRUCTION_RULES];
      
      if (!rules || rules.inspections_required.length === 0) continue;

      for (const inspectionType of rules.inspections_required) {
        // Check if inspection is scheduled
        const { data: inspection } = await supabase
          .from("inspection_schedule")
          .select("*")
          .eq("project_id", task.project_id)
          .eq("inspection_type", inspectionType)
          .single();

        if (!inspection) {
          conflicts.push({
            conflict_id: crypto.randomUUID(),
            conflict_type: "inspection_gap",
            severity: "high",
            affected_tasks: [task.id],
            suggested_resolution: `Schedule ${inspectionType} for ${phase} completion`,
            auto_resolvable: true
          });
        }
      }
    }

    return conflicts;
  }

  private getDateRange(start: Date, end: Date): Date[] {
    const dates = [];
    const current = new Date(start);
    
    while (current <= end) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return dates;
  }
}

export const constructionFlowEngine = new ConstructionFlowEngine();

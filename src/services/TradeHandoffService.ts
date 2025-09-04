import { supabase } from "@/integrations/supabase/client";

export interface TradeHandoff {
  from_trade: string;
  to_trade: string;
  handoff_type: "sequential" | "overlap" | "parallel";
  dependencies: string[];
  quality_checklist: QualityCheckItem[];
  completion_criteria: string[];
  estimated_handoff_time: number; // in hours
  buffer_time: number; // in hours
  critical_path: boolean;
}

export interface QualityCheckItem {
  check_id: string;
  description: string;
  responsible_party: "outgoing_trade" | "incoming_trade" | "inspector";
  required: boolean;
  completion_photo_required: boolean;
  sign_off_required: boolean;
}

export interface HandoffStatus {
  handoff_id: string;
  project_id: string;
  from_trade: string;
  to_trade: string;
  status:
    | "pending"
    | "ready"
    | "in_progress"
    | "completed"
    | "delayed"
    | "blocked";
  completion_percentage: number;
  quality_checks_completed: number;
  quality_checks_total: number;
  estimated_completion: Date;
  actual_completion?: Date;
  delay_reasons: string[];
  blocking_issues: BlockingIssue[];
}

export interface BlockingIssue {
  issue_id: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  responsible_party: string;
  estimated_resolution_time: number;
  created_at: Date;
  resolved_at?: Date;
}

export interface TradeCoordination {
  coordination_id: string;
  project_id: string;
  coordination_date: Date;
  trades_involved: string[];
  coordination_type:
    | "daily_standup"
    | "weekly_planning"
    | "issue_resolution"
    | "handoff_meeting";
  agenda_items: AgendaItem[];
  decisions_made: Decision[];
  action_items: ActionItem[];
  next_meeting_date?: Date;
}

export interface AgendaItem {
  item_id: string;
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
  time_allocated: number; // in minutes
  presenter: string;
}

export interface Decision {
  decision_id: string;
  title: string;
  description: string;
  decision_maker: string;
  impact_level: "low" | "medium" | "high";
  affected_trades: string[];
  implementation_date: Date;
}

export interface ActionItem {
  action_id: string;
  description: string;
  assigned_to: string;
  due_date: Date;
  priority: "low" | "medium" | "high";
  status: "open" | "in_progress" | "completed" | "overdue";
  dependencies: string[];
}

export interface TradePerformanceMetrics {
  trade_name: string;
  project_id: string;
  handoff_success_rate: number;
  average_handoff_time: number;
  quality_score: number;
  on_time_completion_rate: number;
  rework_incidents: number;
  communication_score: number;
  coordination_participation: number;
}

export interface ConflictResolution {
  conflict_id: string;
  project_id: string;
  involved_trades: string[];
  conflict_type:
    | "scheduling"
    | "quality"
    | "resource"
    | "scope"
    | "communication";
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  reported_by: string;
  assigned_mediator: string;
  resolution_strategy: string;
  status: "open" | "mediation" | "resolved" | "escalated";
  resolution_date?: Date;
  lessons_learned: string[];
}

class TradeHandoffService {
  /**
   * Get all handoff statuses for a project
   */
  async getProjectHandoffStatuses(
    project_id: string
  ): Promise<HandoffStatus[]> {
    try {
      const { data, error } = await supabase
        .from("trade_handoffs")
        .select(
          `
          *,
          quality_checks(count),
          quality_checks!inner(completed:count)
        `
        )
        .eq("project_id", project_id)
        .order("estimated_completion");

      if (error) throw error;

      return (data || []).map((handoff) => ({
        handoff_id: handoff.id,
        project_id: handoff.project_id,
        from_trade: handoff.from_trade,
        to_trade: handoff.to_trade,
        status: handoff.status,
        completion_percentage: handoff.completion_percentage || 0,
        quality_checks_completed: handoff.quality_checks?.completed || 0,
        quality_checks_total: handoff.quality_checks?.count || 0,
        estimated_completion: new Date(handoff.estimated_completion),
        actual_completion: handoff.actual_completion
          ? new Date(handoff.actual_completion)
          : undefined,
        delay_reasons: handoff.delay_reasons || [],
        blocking_issues: handoff.blocking_issues || [],
      }));
    } catch (error) {
      console.error("Error fetching handoff statuses:", error);
      throw error;
    }
  }

  /**
   * Create automated handoff sequence based on project tasks
   */
  async generateHandoffSequence(project_id: string): Promise<TradeHandoff[]> {
    try {
      // Get project tasks with trade assignments
      const { data: tasks, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("project_id", project_id)
        .order("start_date");

      if (error) throw error;

      const handoffs: TradeHandoff[] = [];
      const tradeSequence = this.extractTradeSequence(tasks || []);

      for (let i = 0; i < tradeSequence.length - 1; i++) {
        const fromTrade = tradeSequence[i];
        const toTrade = tradeSequence[i + 1];

        const handoff = this.createHandoffTemplate(fromTrade, toTrade);
        handoffs.push(handoff);
      }

      // Save handoffs to database
      await this.saveHandoffSequence(project_id, handoffs);

      return handoffs;
    } catch (error) {
      console.error("Error generating handoff sequence:", error);
      throw error;
    }
  }

  /**
   * Update handoff status and trigger notifications
   */
  async updateHandoffStatus(
    handoff_id: string,
    status: HandoffStatus["status"],
    completion_percentage?: number,
    notes?: string
  ): Promise<void> {
    try {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (completion_percentage !== undefined) {
        updateData.completion_percentage = completion_percentage;
      }

      if (status === "completed") {
        updateData.actual_completion = new Date().toISOString();
      }

      const { error } = await supabase
        .from("trade_handoffs")
        .update(updateData)
        .eq("id", handoff_id);

      if (error) throw error;

      // Trigger notifications
      await this.sendHandoffNotifications(handoff_id, status);

      // Update project timeline if needed
      if (status === "completed" || status === "delayed") {
        await this.updateProjectTimeline(handoff_id);
      }
    } catch (error) {
      console.error("Error updating handoff status:", error);
      throw error;
    }
  }

  /**
   * Perform quality checks for handoff
   */
  async performQualityCheck(
    handoff_id: string,
    check_id: string,
    passed: boolean,
    notes?: string,
    photo_url?: string
  ): Promise<void> {
    try {
      const { error } = await supabase.from("quality_checks").upsert({
        handoff_id,
        check_id,
        passed,
        notes,
        photo_url,
        completed_at: new Date().toISOString(),
        completed_by: (await supabase.auth.getUser()).data.user?.id,
      });

      if (error) throw error;

      // Check if all quality checks are complete
      await this.checkHandoffReadiness(handoff_id);
    } catch (error) {
      console.error("Error performing quality check:", error);
      throw error;
    }
  }

  /**
   * Schedule trade coordination meeting
   */
  async scheduleCoordinationMeeting(
    project_id: string,
    coordination_type: TradeCoordination["coordination_type"],
    meeting_date: Date,
    trades_involved: string[],
    agenda_items: AgendaItem[]
  ): Promise<string> {
    try {
      const { data, error } = await supabase
        .from("trade_coordination_meetings")
        .insert({
          project_id,
          coordination_type,
          coordination_date: meeting_date.toISOString(),
          trades_involved,
          agenda_items,
          status: "scheduled",
        })
        .select()
        .single();

      if (error) throw error;

      // Send meeting invitations
      await this.sendMeetingInvitations(data.id, trades_involved);

      return data.id;
    } catch (error) {
      console.error("Error scheduling coordination meeting:", error);
      throw error;
    }
  }

  /**
   * Detect and resolve trade conflicts
   */
  async detectTradeConflicts(
    project_id: string
  ): Promise<ConflictResolution[]> {
    try {
      const conflicts: ConflictResolution[] = [];

      // Check for scheduling conflicts
      const schedulingConflicts = await this.detectSchedulingConflicts(
        project_id
      );
      conflicts.push(...schedulingConflicts);

      // Check for resource conflicts
      const resourceConflicts = await this.detectResourceConflicts(project_id);
      conflicts.push(...resourceConflicts);

      // Check for quality conflicts
      const qualityConflicts = await this.detectQualityConflicts(project_id);
      conflicts.push(...qualityConflicts);

      // Save conflicts to database
      for (const conflict of conflicts) {
        await this.saveConflictResolution(conflict);
      }

      return conflicts;
    } catch (error) {
      console.error("Error detecting trade conflicts:", error);
      throw error;
    }
  }

  /**
   * Generate trade performance report
   */
  async generateTradePerformanceReport(
    project_id: string,
    trade_name?: string
  ): Promise<TradePerformanceMetrics[]> {
    try {
      let query = supabase
        .from("trade_handoffs")
        .select(
          `
          *,
          quality_checks(passed, completed_at),
          project_tasks(completed_at, due_date)
        `
        )
        .eq("project_id", project_id);

      if (trade_name) {
        query = query.or(
          `from_trade.eq.${trade_name},to_trade.eq.${trade_name}`
        );
      }

      const { data: handoffs, error } = await query;

      if (error) throw error;

      const metricsMap = new Map<string, TradePerformanceMetrics>();

      for (const handoff of handoffs || []) {
        const trades = [handoff.from_trade, handoff.to_trade];

        for (const trade of trades) {
          if (!metricsMap.has(trade)) {
            metricsMap.set(trade, {
              trade_name: trade,
              project_id,
              handoff_success_rate: 0,
              average_handoff_time: 0,
              quality_score: 0,
              on_time_completion_rate: 0,
              rework_incidents: 0,
              communication_score: 0,
              coordination_participation: 0,
            });
          }

          const metrics = metricsMap.get(trade)!;
          this.updateTradeMetrics(metrics, handoff);
        }
      }

      return Array.from(metricsMap.values());
    } catch (error) {
      console.error("Error generating trade performance report:", error);
      throw error;
    }
  }

  /**
   * Get upcoming handoffs requiring attention
   */
  async getUpcomingHandoffs(
    project_id: string,
    days_ahead: number = 7
  ): Promise<HandoffStatus[]> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() + days_ahead);

      const { data, error } = await supabase
        .from("trade_handoffs")
        .select("*")
        .eq("project_id", project_id)
        .lte("estimated_completion", cutoffDate.toISOString())
        .in("status", ["pending", "ready", "in_progress"])
        .order("estimated_completion");

      if (error) throw error;

      return (data || []).map((handoff) => ({
        handoff_id: handoff.id,
        project_id: handoff.project_id,
        from_trade: handoff.from_trade,
        to_trade: handoff.to_trade,
        status: handoff.status,
        completion_percentage: handoff.completion_percentage || 0,
        quality_checks_completed: 0, // Would need additional query
        quality_checks_total: 0, // Would need additional query
        estimated_completion: new Date(handoff.estimated_completion),
        actual_completion: handoff.actual_completion
          ? new Date(handoff.actual_completion)
          : undefined,
        delay_reasons: handoff.delay_reasons || [],
        blocking_issues: handoff.blocking_issues || [],
      }));
    } catch (error) {
      console.error("Error fetching upcoming handoffs:", error);
      throw error;
    }
  }

  /**
   * Private helper methods
   */
  private extractTradeSequence(tasks: any[]): string[] {
    // Extract unique trades from tasks in chronological order
    const tradeMap = new Map();

    for (const task of tasks) {
      if (task.assigned_trade && !tradeMap.has(task.assigned_trade)) {
        tradeMap.set(task.assigned_trade, new Date(task.start_date));
      }
    }

    // Sort trades by start date
    return Array.from(tradeMap.entries())
      .sort(([, dateA], [, dateB]) => dateA.getTime() - dateB.getTime())
      .map(([trade]) => trade);
  }

  private createHandoffTemplate(
    fromTrade: string,
    toTrade: string
  ): TradeHandoff {
    const handoffTemplates = this.getHandoffTemplates();
    const key = `${fromTrade}-${toTrade}`;

    return (
      handoffTemplates[key] || {
        from_trade: fromTrade,
        to_trade: toTrade,
        handoff_type: "sequential",
        dependencies: [],
        quality_checklist: this.getDefaultQualityChecklist(fromTrade, toTrade),
        completion_criteria: this.getDefaultCompletionCriteria(
          fromTrade,
          toTrade
        ),
        estimated_handoff_time: 4, // Default 4 hours
        buffer_time: 2, // Default 2 hour buffer
        critical_path: false,
      }
    );
  }

  private getHandoffTemplates(): Record<string, TradeHandoff> {
    return {
      "foundation-framing": {
        from_trade: "foundation",
        to_trade: "framing",
        handoff_type: "sequential",
        dependencies: ["concrete_cured", "foundation_inspection_passed"],
        quality_checklist: [
          {
            check_id: "foundation_level",
            description: "Foundation level within tolerance",
            responsible_party: "inspector",
            required: true,
            completion_photo_required: true,
            sign_off_required: true,
          },
          {
            check_id: "anchor_bolts",
            description: "Anchor bolts properly positioned",
            responsible_party: "outgoing_trade",
            required: true,
            completion_photo_required: true,
            sign_off_required: true,
          },
        ],
        completion_criteria: [
          "Foundation inspection passed",
          "All anchor bolts in place",
          "Foundation level verified",
          "Cleanup completed",
        ],
        estimated_handoff_time: 6,
        buffer_time: 4,
        critical_path: true,
      },
      "framing-electrical": {
        from_trade: "framing",
        to_trade: "electrical",
        handoff_type: "overlap",
        dependencies: ["rough_framing_complete"],
        quality_checklist: [
          {
            check_id: "framing_inspection",
            description: "Framing inspection passed",
            responsible_party: "inspector",
            required: true,
            completion_photo_required: false,
            sign_off_required: true,
          },
          {
            check_id: "electrical_pathways",
            description: "Electrical pathways clear",
            responsible_party: "outgoing_trade",
            required: true,
            completion_photo_required: true,
            sign_off_required: false,
          },
        ],
        completion_criteria: [
          "Rough framing complete",
          "Electrical pathways identified",
          "Load-bearing modifications approved",
        ],
        estimated_handoff_time: 2,
        buffer_time: 1,
        critical_path: false,
      },
    };
  }

  private getDefaultQualityChecklist(
    fromTrade: string,
    toTrade: string
  ): QualityCheckItem[] {
    return [
      {
        check_id: "work_area_clean",
        description: "Work area cleaned and prepared",
        responsible_party: "outgoing_trade",
        required: true,
        completion_photo_required: true,
        sign_off_required: false,
      },
      {
        check_id: "quality_standards",
        description: "Work meets quality standards",
        responsible_party: "inspector",
        required: true,
        completion_photo_required: false,
        sign_off_required: true,
      },
      {
        check_id: "safety_compliance",
        description: "Safety requirements met",
        responsible_party: "outgoing_trade",
        required: true,
        completion_photo_required: false,
        sign_off_required: true,
      },
    ];
  }

  private getDefaultCompletionCriteria(
    fromTrade: string,
    toTrade: string
  ): string[] {
    return [
      "All scheduled work completed",
      "Quality inspection passed",
      "Work area cleaned",
      "Materials and tools removed",
      "Documentation updated",
    ];
  }

  private async saveHandoffSequence(
    project_id: string,
    handoffs: TradeHandoff[]
  ): Promise<void> {
    const handoffData = handoffs.map((handoff) => ({
      project_id,
      from_trade: handoff.from_trade,
      to_trade: handoff.to_trade,
      handoff_type: handoff.handoff_type,
      dependencies: handoff.dependencies,
      quality_checklist: handoff.quality_checklist,
      completion_criteria: handoff.completion_criteria,
      estimated_handoff_time: handoff.estimated_handoff_time,
      buffer_time: handoff.buffer_time,
      critical_path: handoff.critical_path,
      status: "pending",
    }));

    const { error } = await supabase.from("trade_handoffs").insert(handoffData);

    if (error) throw error;
  }

  private async sendHandoffNotifications(
    handoff_id: string,
    status: string
  ): Promise<void> {
    // Implementation would send notifications to relevant trades
    console.log(`Sending handoff notification: ${handoff_id} - ${status}`);
  }

  private async updateProjectTimeline(handoff_id: string): Promise<void> {
    // Implementation would update project timeline based on handoff completion
    console.log(`Updating project timeline for handoff: ${handoff_id}`);
  }

  private async checkHandoffReadiness(handoff_id: string): Promise<void> {
    const { data: checks, error } = await supabase
      .from("quality_checks")
      .select("*")
      .eq("handoff_id", handoff_id);

    if (error) throw error;

    const requiredChecks = checks?.filter((c) => c.required) || [];
    const completedRequiredChecks = requiredChecks.filter((c) => c.passed);

    if (completedRequiredChecks.length === requiredChecks.length) {
      await this.updateHandoffStatus(handoff_id, "ready");
    }
  }

  private async sendMeetingInvitations(
    meeting_id: string,
    trades: string[]
  ): Promise<void> {
    // Implementation would send meeting invitations
    console.log(
      `Sending meeting invitations: ${meeting_id} to ${trades.join(", ")}`
    );
  }

  private async detectSchedulingConflicts(
    project_id: string
  ): Promise<ConflictResolution[]> {
    // Implementation would detect scheduling conflicts between trades
    return [];
  }

  private async detectResourceConflicts(
    project_id: string
  ): Promise<ConflictResolution[]> {
    // Implementation would detect resource conflicts
    return [];
  }

  private async detectQualityConflicts(
    project_id: string
  ): Promise<ConflictResolution[]> {
    // Implementation would detect quality conflicts
    return [];
  }

  private async saveConflictResolution(
    conflict: ConflictResolution
  ): Promise<void> {
    const { error } = await supabase
      .from("conflict_resolutions")
      .insert(conflict);

    if (error) throw error;
  }

  private updateTradeMetrics(
    metrics: TradePerformanceMetrics,
    handoff: any
  ): void {
    // Calculate various metrics based on handoff data
    // This would be more complex in a real implementation
    metrics.handoff_success_rate = handoff.status === "completed" ? 1 : 0;
    metrics.quality_score =
      handoff.quality_checks?.filter((c: any) => c.passed).length || 0;
  }
}

export const tradeHandoffService = new TradeHandoffService();

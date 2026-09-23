export interface CrewMember {
  name: string;
  role: string;
  hours_worked: number;
  overtime_hours: number;
}

export interface TaskProgress {
  task_name: string;
  planned_completion: number;
  actual_completion: number;
  status: 'on_track' | 'behind' | 'ahead' | 'blocked';
  notes?: string;
}

export interface MaterialUsage {
  material_name: string;
  quantity_used: number;
  unit: string;
  waste_percentage?: number;
}

export interface EquipmentUsage {
  equipment_name: string;
  hours_used: number;
  condition: 'good' | 'fair' | 'needs_repair' | 'down';
  notes?: string;
}

export interface DailyReportData {
  report_date: string;
  project_id: string;
  weather_conditions: string;
  temperature: string;
  work_performed: string;
  crew_members: CrewMember[];
  task_progress: TaskProgress[];
  material_usage: MaterialUsage[];
  equipment_usage: EquipmentUsage[];
  safety_observations: string;
  quality_issues: string;
  delays_challenges: string;
  photos: string[];
  next_day_plan: string;
  client_visitors: string;
  deliveries_received: string;
  total_crew_hours: number;
  work_completion_percentage: number;
}

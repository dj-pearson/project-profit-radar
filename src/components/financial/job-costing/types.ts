export interface JobCost {
  id: string;
  project_id: string;
  cost_code_id: string;
  date: string;
  labor_hours: number;
  labor_cost: number;
  material_cost: number;
  equipment_cost: number;
  other_cost: number;
  total_cost: number;
  description: string;
  created_at: string;
  cost_codes?: {
    code: string;
    name: string;
    category: string;
  };
}

export interface Project {
  id: string;
  name: string;
  budget: number;
  status: string;
}

export interface CostCode {
  id: string;
  code: string;
  name: string;
  category: string;
}

export interface CostSummary {
  totalCost: number;
  laborCost: number;
  materialCost: number;
  equipmentCost: number;
  otherCost: number;
  budgetVariance: number;
  budgetVariancePercentage: number;
}

/** The add/edit cost forms hold every field as the string the input produced. */
export interface JobCostForm {
  project_id: string;
  cost_code_id: string;
  date: string;
  labor_hours: string;
  labor_cost: string;
  material_cost: string;
  equipment_cost: string;
  other_cost: string;
  description: string;
}

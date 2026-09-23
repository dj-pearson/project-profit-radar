import * as z from "zod";

export const estimateSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  client_name: z.string().min(1, "Client name is required"),
  client_email: z.string().email("Valid email is required"),
  client_phone: z.string().optional(),
  site_address: z.string().optional(),
  project_id: z.string().optional(),
  markup_percentage: z.number().min(0).max(100),
  tax_percentage: z.number().min(0).max(100),
  discount_amount: z.number().min(0),
  valid_until: z.date().optional(),
  notes: z.string().optional(),
  terms_and_conditions: z.string().optional(),
});

export type EstimateFormData = z.infer<typeof estimateSchema>;

export interface LineItem {
  id: string;
  item_name: string;
  description: string;
  quantity: number;
  unit: string;
  unit_cost: number;
  category: string;
  /**
   * US-318: cost codes were fetched into state and never used. The column
   * existed on estimate_line_items and the insert omitted it, so no estimate
   * could ever seed a cost-coded budget - and project_budgets.cost_code_id is
   * NOT NULL, which is why converting an estimate produced no budget at all.
   */
  cost_code_id: string;
  /** US-332: NULL means the estimate's tax rate applies. */
  tax_rate: number | null;
  taxable: boolean;
}

// tax_rate and taxable are US-332 columns on estimate_line_items and
// tax_amount on estimates; the generated types predate them.
export type LineTaxColumns = { tax_rate?: number | null; taxable?: boolean };

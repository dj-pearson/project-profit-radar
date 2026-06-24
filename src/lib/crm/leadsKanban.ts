/**
 * CRM leads kanban-board logic (US-073).
 *
 * Pure grouping/derivation helpers — no React, no Supabase — so the pipeline
 * stage math is unit testable. Stage keys align with the existing `leads.status`
 * taxonomy used across CRMLeads so drag-and-drop writes back compatible values.
 */

export interface KanbanLead {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  company_name?: string | null;
  estimated_budget?: number | null;
  status?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
}

export interface LeadStage {
  key: string;
  label: string;
}

/** Pipeline stages, matching the status values already used in CRMLeads filters. */
export const LEAD_STAGES: LeadStage[] = [
  { key: 'new', label: 'New Lead' },
  { key: 'contacted', label: 'Contacted' },
  { key: 'qualified', label: 'Qualified' },
  { key: 'proposal_sent', label: 'Proposal Sent' },
  { key: 'negotiating', label: 'Negotiation' },
  { key: 'won', label: 'Won' },
  { key: 'lost', label: 'Lost' },
];

const STAGE_KEYS = new Set(LEAD_STAGES.map((s) => s.key));

/** Normalize an arbitrary status to a known stage key, defaulting to 'new'. */
export function normalizeStage(status: string | null | undefined): string {
  if (status && STAGE_KEYS.has(status)) return status;
  return 'new';
}

export interface LeadColumn extends LeadStage {
  leads: KanbanLead[];
  count: number;
  totalValue: number;
}

/** Group leads into pipeline columns (always returns all stages, in order). */
export function groupLeadsByStage(leads: KanbanLead[]): LeadColumn[] {
  const byStage = new Map<string, KanbanLead[]>();
  for (const stage of LEAD_STAGES) byStage.set(stage.key, []);
  for (const lead of leads) {
    byStage.get(normalizeStage(lead.status))!.push(lead);
  }
  return LEAD_STAGES.map((stage) => {
    const stageLeads = byStage.get(stage.key)!;
    return {
      ...stage,
      leads: stageLeads,
      count: stageLeads.length,
      totalValue: stageLeads.reduce((sum, l) => sum + (l.estimated_budget ?? 0), 0),
    };
  });
}

/** Whole days a lead has sat in its current stage (since updated_at, else created_at). */
export function daysInStage(lead: KanbanLead, asOf: Date = new Date()): number {
  const stamp = lead.updated_at ?? lead.created_at;
  if (!stamp) return 0;
  const since = new Date(stamp).getTime();
  if (Number.isNaN(since)) return 0;
  return Math.max(Math.floor((asOf.getTime() - since) / 86_400_000), 0);
}

/** Display name for a lead card, falling back to company or a placeholder. */
export function leadDisplayName(lead: KanbanLead): string {
  const name = [lead.first_name, lead.last_name].filter(Boolean).join(' ').trim();
  return name || lead.company_name || 'Unnamed lead';
}

export type ValueTier = 'high' | 'medium' | 'low';

/** Color tier for a lead card based on estimated budget. */
export function valueTier(estimatedBudget: number | null | undefined): ValueTier {
  const value = estimatedBudget ?? 0;
  if (value >= 100_000) return 'high';
  if (value >= 25_000) return 'medium';
  return 'low';
}

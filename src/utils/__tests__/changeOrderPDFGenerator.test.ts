/**
 * US-332: change-order terms and the licence line print on the change order.
 * jsPDF writes text uncompressed by default, so the rendered PDF source is
 * searchable for what was printed.
 */
import { describe, it, expect } from 'vitest';
import { buildChangeOrderPDF } from '../changeOrderPDFGenerator';

describe('change order PDF', () => {
  const pdf = buildChangeOrderPDF(
    {
      change_order_number: 'CO-007',
      title: 'Upgrade to quartz counters',
      description: 'Replace laminate with 3cm quartz.',
      amount: 4250,
      project_name: 'Maple St Remodel',
      customer_name: 'Reyes',
      impact_days: 3,
      terms: 'Work starts once this change order is signed.',
    },
    { name: 'Reyes Builders', licenseLine: 'Licence CCB-123456 | Insured by Acme (policy GL-9)' },
  ).output();

  it('prints the company header with licence and insurance', () => {
    expect(pdf).toContain('Reyes Builders');
    expect(pdf).toContain('Licence CCB-123456 | Insured by Acme \\(policy GL-9\\)');
  });

  it('prints the number, the change, its cost and its schedule effect', () => {
    expect(pdf).toContain('Change order CO-007');
    expect(pdf).toContain('Upgrade to quartz counters');
    expect(pdf).toContain('Change to contract: $4,250.00');
    expect(pdf).toContain('Change to schedule: +3 days');
  });

  it('prints the company change-order terms', () => {
    expect(pdf).toContain('Terms and conditions');
    expect(pdf).toContain('Work starts once this change order is signed.');
  });
});

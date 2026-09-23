/**
 * US-332: invoices and estimates print the company, its licence and insurance,
 * and tax per rate - not the Brikly placeholder or an invented licence number.
 */
import { describe, it, expect } from 'vitest';
import { InvoicePDFGenerator } from '../invoicePDFGenerator';
import { EstimatePDFGenerator } from '../estimatePDFGenerator';

const company = { name: 'Reyes Builders', licenseLine: 'Licence CCB-123456' };

// The generators keep their jsPDF private; the uncompressed PDF source is the
// only place the printed text can be read back.
const render = async (g: InvoicePDFGenerator | EstimatePDFGenerator) => {
  await g.generatePDF();
  return (g as unknown as { doc: { output: () => string } }).doc.output();
};

describe('invoice PDF', () => {
  const invoice = {
    invoice_number: 'INV-0042', issue_date: '2026-09-23', due_date: '2026-10-08',
    client_name: 'Reyes', client_email: 'r@example.com', subtotal: 2100, tax_rate: 8.25,
    tax_amount: 142.5, total_amount: 2242.5, status: 'draft', terms: 'Net 15',
    line_items: [{ description: 'Framing', quantity: 1, unit_price: 2100 }],
    tax_breakdown: [{ label: 'County (6%)', tax: 60 }, { label: 'Tax (8.25%)', tax: 82.5 }],
  };

  it('prints the company and its licence line, and no Brikly contact details', async () => {
    const pdf = await render(new InvoicePDFGenerator(invoice, company));
    expect(pdf).toContain('Reyes Builders');
    expect(pdf).toContain('Licence CCB-123456');
    expect(pdf).not.toContain('billing@brikly.net');
  });

  it('prints one tax line per rate', async () => {
    const pdf = await render(new InvoicePDFGenerator(invoice, company));
    expect(pdf).toContain('County \\(6%\\):');
    expect(pdf).toContain('$60.00');
    expect(pdf).toContain('Tax \\(8.25%\\):');
    expect(pdf).toContain('$82.50');
  });
});

describe('estimate PDF', () => {
  const estimate = {
    estimate_number: 'EST-0007', estimate_date: '2026-09-23', title: 'Kitchen', client_name: 'Reyes',
    client_email: null, status: 'draft', markup_percentage: 20, tax_percentage: 8.25,
    discount_amount: 100, total_amount: 1000, tax_amount: 99, terms_and_conditions: 'Valid 30 days',
    line_items: [{ item_name: 'Cabinets', quantity: 1, unit: 'each', unit_cost: 1000, total_cost: 1000 }],
  };

  it('prints no invented licence number', async () => {
    const pdf = await render(new EstimatePDFGenerator(estimate, { name: 'Reyes Builders' }));
    expect(pdf).not.toContain('License #123456');
    const withLicence = await render(new EstimatePDFGenerator(estimate, company));
    expect(withLicence).toContain('Licence CCB-123456');
  });

  it('prints the tax the form stored rather than recomputing it on another base', async () => {
    // Recomputed the old way: (1000 * 1.2 - 100) * 8.25% = 90.75.
    const pdf = await render(new EstimatePDFGenerator(estimate, company));
    expect(pdf).toContain('$99.00');
    expect(pdf).not.toContain('$90.75');
  });
});

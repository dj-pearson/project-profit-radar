/**
 * Change order PDF (US-332).
 *
 * There was no way to print a change order, so the company's change-order
 * terms (Company Settings > Billing and documents) had nowhere to appear and a
 * customer had nothing to sign but a screen. One page: the company header with
 * licence and insurance, what changed, what it costs, the terms, and two
 * signature lines.
 */
import jsPDF from 'jspdf';

export interface ChangeOrderPdfData {
  change_order_number: string;
  title: string;
  description?: string | null;
  reason?: string | null;
  amount: number;
  created_at?: string | null;
  project_name?: string | null;
  customer_name?: string | null;
  impact_days?: number | null;
  /** From company_settings.change_order_terms. */
  terms?: string | null;
}

export interface ChangeOrderPdfCompany {
  name: string;
  address?: string;
  licenseLine?: string;
}

const money = (n: number) =>
  `$${(Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function buildChangeOrderPDF(order: ChangeOrderPdfData, company: ChangeOrderPdfCompany): jsPDF {
  const doc = new jsPDF('portrait', 'mm', 'a4');
  const margin = 15;
  const width = doc.internal.pageSize.getWidth() - 2 * margin;
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = margin + 5;

  const ensureRoom = (needed: number) => {
    if (y + needed > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const paragraph = (text: string, size = 10) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(size);
    for (const line of doc.splitTextToSize(text, width) as string[]) {
      ensureRoom(5);
      doc.text(line, margin, y);
      y += 5;
    }
  };

  const heading = (text: string) => {
    ensureRoom(12);
    y += 3;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(text, margin, y);
    y += 6;
  };

  // Company header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(company.name, margin, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(90, 90, 90);
  if (company.address) {
    for (const line of doc.splitTextToSize(company.address, width) as string[]) {
      doc.text(line, margin, y);
      y += 4;
    }
  }
  if (company.licenseLine) {
    for (const line of doc.splitTextToSize(company.licenseLine, width) as string[]) {
      doc.text(line, margin, y);
      y += 4;
    }
  }
  doc.setTextColor(0, 0, 0);

  // Title block
  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(`Change order ${order.change_order_number}`, margin, y);
  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const facts = [
    order.project_name ? `Project: ${order.project_name}` : '',
    order.customer_name ? `Customer: ${order.customer_name}` : '',
    order.created_at ? `Date: ${order.created_at.slice(0, 10)}` : '',
  ].filter(Boolean);
  for (const fact of facts) {
    doc.text(fact, margin, y);
    y += 5;
  }

  heading(order.title);
  if (order.description) paragraph(order.description);
  if (order.reason) {
    heading('Reason');
    paragraph(order.reason);
  }

  heading('Cost and schedule');
  paragraph(`Change to contract: ${order.amount < 0 ? '-' : ''}${money(Math.abs(order.amount))}`);
  if (order.impact_days) {
    paragraph(`Change to schedule: ${order.impact_days > 0 ? '+' : ''}${order.impact_days} day${Math.abs(order.impact_days) === 1 ? '' : 's'}`);
  }

  if (order.terms) {
    heading('Terms and conditions');
    paragraph(order.terms, 9);
  }

  // Signatures
  ensureRoom(30);
  y += 14;
  const half = width / 2 - 5;
  doc.setDrawColor(120, 120, 120);
  doc.line(margin, y, margin + half, y);
  doc.line(margin + half + 10, y, margin + width, y);
  y += 5;
  doc.setFontSize(9);
  doc.text(`${company.name}`, margin, y);
  doc.text('Customer', margin + half + 10, y);
  y += 4;
  doc.text('Signature and date', margin, y);
  doc.text('Signature and date', margin + half + 10, y);

  return doc;
}

export function downloadChangeOrderPDF(
  order: ChangeOrderPdfData,
  company: ChangeOrderPdfCompany,
  filename = `change-order-${order.change_order_number}.pdf`
): void {
  buildChangeOrderPDF(order, company).save(filename);
}

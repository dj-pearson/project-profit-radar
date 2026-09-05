/**
 * The handover bundle a customer gets at closeout (US-328).
 *
 * One PDF rather than a zip, deliberately: the repo has jspdf but no zip
 * library, and an owner who is handed a folder of loose files loses half of
 * them. Documents are listed with their names and dates rather than embedded,
 * because they are in private storage and a signed URL in a PDF expires - the
 * list tells the owner what exists and the portal serves the files.
 */
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

export interface HandoverProject {
  name: string;
  client_name: string | null;
  site_address: string | null;
  start_date: string | null;
  completed_at: string | null;
  original_contract_value: number | null;
  current_contract_value: number | null;
}

export interface HandoverBundleData {
  project: HandoverProject;
  companyName: string;
  closeoutItems: Array<{ category: string; name: string; status: string; completed_at: string | null }>;
  punchItems: Array<{ item_number: string; description: string; status: string | null; date_completed: string | null }>;
  changeOrders: Array<{ change_order_number: string; title: string; amount: number | null; status: string | null }>;
  invoices: Array<{ invoice_number: string; total_amount: number; amount_due: number | null; status: string }>;
  warranties: Array<{ item_name: string; manufacturer: string | null; warranty_end_date?: string | null; status: string }>;
  documents: Array<{ name: string; created_at: string }>;
}

const money = (n: number | null | undefined) =>
  (Number(n) || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

const day = (d: string | null | undefined) =>
  d ? format(new Date(d), 'MMM d, yyyy') : '';

export function generateHandoverBundle(data: HandoverBundleData): jsPDF {
  const doc = new jsPDF();
  const { project } = data;

  doc.setFontSize(18);
  doc.text('Project handover', 14, 20);
  doc.setFontSize(11);
  doc.text(project.name, 14, 28);

  doc.setFontSize(9);
  const header: string[] = [
    project.client_name ? `Customer: ${project.client_name}` : '',
    project.site_address ? `Site: ${project.site_address}` : '',
    project.start_date ? `Started: ${day(project.start_date)}` : '',
    project.completed_at ? `Completed: ${day(project.completed_at)}` : '',
    `Prepared by ${data.companyName} on ${format(new Date(), 'MMM d, yyyy')}`,
  ].filter(Boolean);
  header.forEach((line, i) => doc.text(line, 14, 36 + i * 5));

  let y = 40 + header.length * 5;

  const section = (title: string, head: string[], body: string[][]) => {
    if (body.length === 0) return;
    doc.setFontSize(12);
    doc.text(title, 14, y);
    autoTable(doc, {
      startY: y + 3,
      head: [head],
      body,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [60, 60, 60] },
      margin: { left: 14, right: 14 },
    });
    // jspdf-autotable stores where it finished on the document.
    const finished = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable;
    y = (finished?.finalY ?? y) + 12;
    if (y > 250) { doc.addPage(); y = 20; }
  };

  const contract = project.current_contract_value ?? project.original_contract_value ?? 0;
  const changeTotal = data.changeOrders
    .filter((c) => c.status === 'approved')
    .reduce((sum, c) => sum + (Number(c.amount) || 0), 0);

  section('Contract', ['', 'Amount'], [
    ['Original contract', money(project.original_contract_value)],
    ['Approved change orders', money(changeTotal)],
    ['Final contract value', money(contract)],
  ]);

  section('Closeout checklist', ['Category', 'Item', 'Status', 'Completed'],
    data.closeoutItems.map((i) => [i.category, i.name, i.status, day(i.completed_at)]));

  section('Punch list', ['#', 'Item', 'Status', 'Completed'],
    data.punchItems.map((p) => [p.item_number, p.description, p.status ?? '', day(p.date_completed)]));

  section('Change orders', ['#', 'Description', 'Amount', 'Status'],
    data.changeOrders.map((c) => [c.change_order_number, c.title, money(c.amount), c.status ?? '']));

  section('Invoices', ['#', 'Total', 'Outstanding', 'Status'],
    data.invoices.map((i) => [i.invoice_number, money(i.total_amount), money(i.amount_due), i.status]));

  section('Warranties', ['Item', 'Manufacturer', 'Expires', 'Status'],
    data.warranties.map((w) => [w.item_name, w.manufacturer ?? '', day(w.warranty_end_date), w.status]));

  section('Project documents', ['Document', 'Added'],
    data.documents.map((d) => [d.name, day(d.created_at)]));

  if (data.documents.length > 0) {
    doc.setFontSize(8);
    doc.text(
      'Documents are listed by name. The files themselves are available through the customer portal.',
      14, Math.min(y, 285)
    );
  }

  return doc;
}

export function downloadHandoverBundle(data: HandoverBundleData): void {
  const doc = generateHandoverBundle(data);
  const safe = data.project.name.replace(/[^A-Za-z0-9-_ ]/g, '').trim().replace(/\s+/g, '-');
  doc.save(`${safe || 'project'}-handover.pdf`);
}

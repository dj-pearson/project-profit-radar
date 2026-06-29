/**
 * US-086: render a generic TableData to a downloadable file in the chosen
 * format. Browser-only (uses xlsx / jsPDF and DOM download); CSV reuses the
 * shared, tested exportCsv helpers.
 */
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { toCsv, downloadCsv, type CsvColumn } from '@/lib/exportCsv';
import type { ExportFormat, TableData } from '@/lib/export-center';

type Row = Record<string, string | number | null>;

function downloadCsvFile(baseName: string, table: TableData): void {
  const columns: CsvColumn<Row>[] = table.columns.map((c) => ({
    header: c.header,
    value: (row) => row[c.key] ?? '',
  }));
  downloadCsv(`${baseName}.csv`, toCsv(table.rows, columns));
}

function downloadExcelFile(baseName: string, table: TableData): void {
  // Map each row to header-keyed values so the sheet shows readable column names.
  const data = table.rows.map((row) =>
    Object.fromEntries(table.columns.map((c) => [c.header, row[c.key] ?? '']))
  );
  const sheet = XLSX.utils.json_to_sheet(data, {
    header: table.columns.map((c) => c.header),
  });
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, 'Report');
  XLSX.writeFile(book, `${baseName}.xlsx`);
}

function downloadPdfFile(baseName: string, title: string, table: TableData): void {
  const doc = new jsPDF({ orientation: table.columns.length > 5 ? 'landscape' : 'portrait' });
  doc.setFontSize(14);
  doc.text(title, 14, 16);
  autoTable(doc, {
    startY: 22,
    head: [table.columns.map((c) => c.header)],
    body: table.rows.map((row) => table.columns.map((c) => String(row[c.key] ?? ''))),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [37, 99, 235] },
  });
  doc.save(`${baseName}.pdf`);
}

/** Generate and download `table` as the given format. */
export function downloadTable(format: ExportFormat, baseName: string, title: string, table: TableData): void {
  if (format === 'csv') downloadCsvFile(baseName, table);
  else if (format === 'excel') downloadExcelFile(baseName, table);
  else downloadPdfFile(baseName, title, table);
}

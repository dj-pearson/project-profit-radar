/**
 * Daily report PDF, with the photos in it (US-330, AC5).
 *
 * The daily report is what a customer is sent to show the job moved. Before
 * this there was no way to print one at all, and the photos, which are the
 * part a customer actually looks at, lived only behind signed URLs in the app.
 *
 * This file only lays out the page. Loading the report, its line items and its
 * photos (signed, fetched and downscaled to JPEG) is loadDailyReportForPdf in
 * src/hooks/useDailyReportExport.ts, so the layout can be tested without a
 * database or a canvas.
 */
import jsPDF from 'jspdf';

export interface DailyReportPdfPhoto {
  /** A JPEG data URL. */
  dataUrl: string;
  width: number;
  height: number;
  caption?: string | null;
  takenAt?: string | null;
}

export interface DailyReportPdfData {
  companyName?: string | null;
  projectName: string;
  date: string;
  weather?: string | null;
  workPerformed?: string | null;
  delays?: string | null;
  safety?: string | null;
  crew: Array<{ name: string; role?: string | null; hours: number; overtime: number }>;
  /** Used when no crew rows exist, e.g. a report filed before US-330. */
  crewCount?: number | null;
  materials: Array<{ name: string; quantity?: number | null; unit?: string | null }>;
  /** The free-text column, printed when there are no material rows. */
  materialsText?: string | null;
  equipment: Array<{ name: string; hours?: number | null }>;
  equipmentText?: string | null;
  photos: DailyReportPdfPhoto[];
  /** Photos on the report that could not be fetched or decoded. */
  photosMissing?: number;
}

const hoursText = (n: number) => `${Math.round(n * 100) / 100}h`;

export function buildDailyReportPDF(report: DailyReportPdfData): jsPDF {
  const doc = new jsPDF('portrait', 'mm', 'a4');
  const margin = 15;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const width = pageWidth - 2 * margin;
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
    doc.setFontSize(12);
    doc.text(text, margin, y);
    y += 6;
  };

  const section = (title: string, body: string | null | undefined) => {
    if (!body || !body.trim()) return;
    heading(title);
    paragraph(body.trim());
  };

  // Header
  if (report.companyName) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(report.companyName, margin, y);
    y += 7;
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(`Daily report: ${report.projectName}`, margin, y);
  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Date: ${report.date}`, margin, y);
  y += 5;
  if (report.weather) {
    paragraph(`Weather: ${report.weather}`);
  }

  section('Work performed', report.workPerformed);

  // Crew
  if (report.crew.length > 0) {
    const total = report.crew.reduce((s, c) => s + c.hours + c.overtime, 0);
    heading(`Crew (${report.crew.length}, ${hoursText(total)})`);
    for (const c of report.crew) {
      const ot = c.overtime > 0 ? ` + ${hoursText(c.overtime)} overtime` : '';
      paragraph(`${c.name}${c.role ? ` (${c.role})` : ''}: ${hoursText(c.hours)}${ot}`);
    }
  } else if (report.crewCount) {
    heading('Crew');
    paragraph(`${report.crewCount} on site`);
  }

  if (report.materials.length > 0) {
    heading('Materials');
    for (const m of report.materials) {
      const qty = m.quantity != null ? `${m.quantity}${m.unit ? ` ${m.unit}` : ''} ` : '';
      paragraph(`${qty}${m.name}`);
    }
  } else {
    section('Materials', report.materialsText);
  }

  if (report.equipment.length > 0) {
    heading('Equipment');
    for (const e of report.equipment) {
      paragraph(`${e.name}${e.hours != null ? `: ${hoursText(e.hours)}` : ''}`);
    }
  } else {
    section('Equipment', report.equipmentText);
  }

  section('Delays and issues', report.delays);
  section('Safety', report.safety);

  // Photos, two across.
  if (report.photos.length > 0 || report.photosMissing) {
    heading(`Photos (${report.photos.length})`);
    if (report.photosMissing) {
      paragraph(`${report.photosMissing} photo(s) on this report could not be included.`, 9);
    }
    const gap = 6;
    const cellWidth = (width - gap) / 2;
    const maxCellHeight = 85;
    let column = 0;
    let rowHeight = 0;
    for (const photo of report.photos) {
      const ratio = photo.width > 0 && photo.height > 0 ? photo.height / photo.width : 0.75;
      const imgWidth = Math.min(cellWidth, maxCellHeight / ratio);
      const imgHeight = imgWidth * ratio;
      const label = [photo.caption, photo.takenAt].filter(Boolean).join(' - ');
      const cellHeight = imgHeight + (label ? 9 : 4);

      // Room for the tallest cell the row could hold, not just this one.
      if (column === 0) ensureRoom(maxCellHeight + 9);
      const x = margin + column * (cellWidth + gap);
      doc.addImage(photo.dataUrl, 'JPEG', x, y, imgWidth, imgHeight);
      if (label) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        const line = (doc.splitTextToSize(label, cellWidth) as string[])[0];
        doc.text(line, x, y + imgHeight + 4);
      }
      rowHeight = Math.max(rowHeight, cellHeight);

      column += 1;
      if (column === 2) {
        column = 0;
        y += rowHeight;
        rowHeight = 0;
      }
    }
    if (column !== 0) y += rowHeight;
  }

  return doc;
}

export const dailyReportPdfFileName = (projectName: string, date: string) =>
  `daily-report-${projectName.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'project'}-${date}.pdf`;

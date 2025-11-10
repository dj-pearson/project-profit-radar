import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

interface InvoiceLineItem {
  description: string;
  quantity: number;
  unit_price: number;
  line_total?: number | null;
  cost_code_id?: string | null;
}

interface InvoiceData {
  invoice_number: string;
  invoice_date?: string | null;
  issue_date: string;
  due_date: string;
  client_name: string | null;
  client_email: string | null;
  client_address?: string | null;
  po_number?: string | null;
  project_name?: string | null;
  subtotal: number;
  tax_rate?: number | null;
  tax_amount?: number | null;
  discount_amount?: number | null;
  total_amount: number;
  amount_paid?: number | null;
  amount_due?: number | null;
  notes?: string | null;
  terms?: string | null;
  status: string;
  retention_percentage?: number | null;
  retention_amount?: number | null;
  line_items?: InvoiceLineItem[];
}

interface CompanyInfo {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
}

export class InvoicePDFGenerator {
  private doc: jsPDF;
  private invoice: InvoiceData;
  private companyInfo: CompanyInfo;
  private pageWidth: number;
  private pageHeight: number;
  private margin: number;
  private currentY: number;

  constructor(invoice: InvoiceData, companyInfo: CompanyInfo = { name: 'BuildDesk' }) {
    this.doc = new jsPDF('portrait', 'mm', 'a4');
    this.invoice = invoice;
    this.companyInfo = {
      name: 'BuildDesk',
      address: '123 Construction Way, Builder City, ST 12345',
      phone: '(555) 123-4567',
      email: 'billing@builddesk.com',
      website: 'www.builddesk.com',
      ...companyInfo,
    };

    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.pageHeight = this.doc.internal.pageSize.getHeight();
    this.margin = 15;
    this.currentY = this.margin;
  }

  public async generatePDF(): Promise<Blob> {
    try {
      this.addHeader();
      this.addCompanyAndClientInfo();
      this.addInvoiceDetails();
      this.addLineItemsTable();
      this.addTotalsSection();
      this.addNotesAndTerms();
      this.addFooter();
      this.addPaymentStatus();

      return this.doc.output('blob');
    } catch (error) {
      console.error('Error generating invoice PDF:', error);
      throw new Error('Failed to generate invoice PDF');
    }
  }

  public download(filename?: string): void {
    const name = filename || `invoice-${this.invoice.invoice_number}.pdf`;
    this.doc.save(name);
  }

  private addHeader(): void {
    // Company logo area
    this.doc.setFillColor(37, 99, 235); // Primary blue
    this.doc.rect(this.margin, this.margin, 50, 25, 'F');

    // Company name in logo
    this.doc.setTextColor(255, 255, 255);
    this.doc.setFontSize(18);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(this.companyInfo.name, this.margin + 25, this.margin + 13, {
      align: 'center',
    });

    this.doc.setFontSize(8);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text('Construction Management', this.margin + 25, this.margin + 19, {
      align: 'center',
    });

    // INVOICE title
    this.doc.setTextColor(0, 0, 0);
    this.doc.setFontSize(28);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('INVOICE', this.pageWidth - this.margin, this.margin + 15, {
      align: 'right',
    });

    // Invoice number
    this.doc.setFontSize(11);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(`#${this.invoice.invoice_number}`, this.pageWidth - this.margin, this.margin + 23, {
      align: 'right',
    });

    this.currentY = this.margin + 35;
  }

  private addCompanyAndClientInfo(): void {
    const startY = this.currentY;
    const columnWidth = (this.pageWidth - 2 * this.margin - 10) / 2;

    // FROM section (Company)
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(100, 100, 100);
    this.doc.text('FROM:', this.margin, startY);

    this.doc.setFontSize(11);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(0, 0, 0);
    this.doc.text(this.companyInfo.name, this.margin, startY + 7);

    this.doc.setFontSize(9);
    this.doc.setFont('helvetica', 'normal');
    let yOffset = startY + 13;

    if (this.companyInfo.address) {
      // Split address into multiple lines if needed
      const addressLines = this.doc.splitTextToSize(this.companyInfo.address, columnWidth - 5);
      addressLines.forEach((line: string) => {
        this.doc.text(line, this.margin, yOffset);
        yOffset += 5;
      });
    }

    if (this.companyInfo.phone) {
      this.doc.text(this.companyInfo.phone, this.margin, yOffset);
      yOffset += 5;
    }

    if (this.companyInfo.email) {
      this.doc.text(this.companyInfo.email, this.margin, yOffset);
      yOffset += 5;
    }

    // BILL TO section (Client)
    const billToX = this.pageWidth / 2 + 5;
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(100, 100, 100);
    this.doc.text('BILL TO:', billToX, startY);

    this.doc.setFontSize(11);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(0, 0, 0);
    this.doc.text(this.invoice.client_name || 'Client Name Not Provided', billToX, startY + 7);

    this.doc.setFontSize(9);
    this.doc.setFont('helvetica', 'normal');
    yOffset = startY + 13;

    if (this.invoice.client_address) {
      const clientAddressLines = this.doc.splitTextToSize(
        this.invoice.client_address,
        columnWidth - 5
      );
      clientAddressLines.forEach((line: string) => {
        this.doc.text(line, billToX, yOffset);
        yOffset += 5;
      });
    }

    if (this.invoice.client_email) {
      this.doc.text(this.invoice.client_email, billToX, yOffset);
      yOffset += 5;
    }

    if (this.invoice.project_name) {
      this.doc.setFont('helvetica', 'bold');
      this.doc.text('Project:', billToX, yOffset);
      this.doc.setFont('helvetica', 'normal');
      this.doc.text(this.invoice.project_name, billToX + 15, yOffset);
      yOffset += 5;
    }

    this.currentY = Math.max(yOffset, startY + 50);
  }

  private addInvoiceDetails(): void {
    const startY = this.currentY + 5;
    const boxWidth = (this.pageWidth - 2 * this.margin) / 2 - 5;

    // Draw background box
    this.doc.setFillColor(248, 250, 252);
    this.doc.setDrawColor(200, 200, 200);
    this.doc.rect(this.margin, startY, this.pageWidth - 2 * this.margin, 25, 'FD');

    // Left column
    this.doc.setFontSize(9);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(100, 100, 100);

    let leftY = startY + 7;
    this.doc.text('INVOICE DATE:', this.margin + 5, leftY);
    this.doc.text('DUE DATE:', this.margin + 5, leftY + 7);

    if (this.invoice.po_number) {
      this.doc.text('PO NUMBER:', this.margin + 5, leftY + 14);
    }

    // Left column values
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(0, 0, 0);
    this.doc.text(
      format(
        new Date(this.invoice.invoice_date || this.invoice.issue_date),
        'MMM dd, yyyy'
      ),
      this.margin + 35,
      leftY
    );
    this.doc.text(format(new Date(this.invoice.due_date), 'MMM dd, yyyy'), this.margin + 35, leftY + 7);

    if (this.invoice.po_number) {
      this.doc.text(this.invoice.po_number, this.margin + 35, leftY + 14);
    }

    // Right column
    const rightX = this.pageWidth / 2 + 5;
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(100, 100, 100);

    let rightY = startY + 7;
    this.doc.text('STATUS:', rightX, rightY);

    // Status badge
    const statusColor = this.getStatusColor(this.invoice.status);
    this.doc.setFillColor(statusColor.bg[0], statusColor.bg[1], statusColor.bg[2]);
    this.doc.roundedRect(rightX + 20, rightY - 4, 25, 6, 2, 2, 'F');
    this.doc.setTextColor(statusColor.text[0], statusColor.text[1], statusColor.text[2]);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(8);
    this.doc.text(this.invoice.status.toUpperCase(), rightX + 32.5, rightY, { align: 'center' });

    // Amount info
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(100, 100, 100);
    this.doc.setFontSize(9);
    this.doc.text('AMOUNT DUE:', rightX, rightY + 10);

    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(37, 99, 235);
    this.doc.setFontSize(14);
    this.doc.text(
      `$${(this.invoice.amount_due || this.invoice.total_amount).toFixed(2)}`,
      rightX + 35,
      rightY + 10
    );

    this.currentY = startY + 35;
  }

  private addLineItemsTable(): void {
    const headers = [['Description', 'Quantity', 'Unit Price', 'Amount']];
    const data = (this.invoice.line_items || []).map((item) => [
      item.description,
      item.quantity.toString(),
      `$${item.unit_price.toFixed(2)}`,
      `$${((item.line_total || item.quantity * item.unit_price)).toFixed(2)}`,
    ]);

    autoTable(this.doc, {
      startY: this.currentY,
      head: headers,
      body: data,
      margin: { left: this.margin, right: this.margin },
      theme: 'striped',
      headStyles: {
        fillColor: [37, 99, 235],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 10,
      },
      bodyStyles: {
        fontSize: 9,
      },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 25, halign: 'center' },
        2: { cellWidth: 30, halign: 'right' },
        3: { cellWidth: 30, halign: 'right' },
      },
      didParseCell: (data: any) => {
        // Add zebra striping
        if (data.section === 'body' && data.row.index % 2 === 0) {
          data.cell.styles.fillColor = [248, 250, 252];
        }
      },
    });

    this.currentY = (this.doc as any).lastAutoTable.finalY + 10;
  }

  private addTotalsSection(): void {
    const rightX = this.pageWidth - this.margin - 60;
    const labelX = rightX;
    const valueX = this.pageWidth - this.margin;
    let y = this.currentY;

    this.doc.setFontSize(10);
    this.doc.setTextColor(0, 0, 0);

    // Subtotal
    this.doc.setFont('helvetica', 'normal');
    this.doc.text('Subtotal:', labelX, y);
    this.doc.text(`$${this.invoice.subtotal.toFixed(2)}`, valueX, y, { align: 'right' });
    y += 7;

    // Discount
    if (this.invoice.discount_amount && this.invoice.discount_amount > 0) {
      this.doc.setTextColor(34, 197, 94); // Green for discount
      this.doc.text('Discount:', labelX, y);
      this.doc.text(`-$${this.invoice.discount_amount.toFixed(2)}`, valueX, y, { align: 'right' });
      this.doc.setTextColor(0, 0, 0);
      y += 7;
    }

    // Tax
    if (this.invoice.tax_amount && this.invoice.tax_amount > 0) {
      const taxLabel = this.invoice.tax_rate
        ? `Tax (${this.invoice.tax_rate}%):`
        : 'Tax:';
      this.doc.text(taxLabel, labelX, y);
      this.doc.text(`$${this.invoice.tax_amount.toFixed(2)}`, valueX, y, { align: 'right' });
      y += 7;
    }

    // Retention
    if (this.invoice.retention_amount && this.invoice.retention_amount > 0) {
      const retentionLabel = this.invoice.retention_percentage
        ? `Retention (${this.invoice.retention_percentage}%):`
        : 'Retention:';
      this.doc.setTextColor(239, 68, 68); // Red for retention
      this.doc.text(retentionLabel, labelX, y);
      this.doc.text(`-$${this.invoice.retention_amount.toFixed(2)}`, valueX, y, { align: 'right' });
      this.doc.setTextColor(0, 0, 0);
      y += 7;
    }

    // Draw line above total
    this.doc.setDrawColor(200, 200, 200);
    this.doc.line(rightX, y, this.pageWidth - this.margin, y);
    y += 5;

    // Total
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(12);
    this.doc.text('TOTAL:', labelX, y);
    this.doc.text(`$${this.invoice.total_amount.toFixed(2)}`, valueX, y, { align: 'right' });
    y += 10;

    // Amount paid
    if (this.invoice.amount_paid && this.invoice.amount_paid > 0) {
      this.doc.setFontSize(10);
      this.doc.setFont('helvetica', 'normal');
      this.doc.setTextColor(34, 197, 94);
      this.doc.text('Amount Paid:', labelX, y);
      this.doc.text(`$${this.invoice.amount_paid.toFixed(2)}`, valueX, y, { align: 'right' });
      y += 7;

      // Amount due
      this.doc.setFont('helvetica', 'bold');
      this.doc.setTextColor(37, 99, 235);
      this.doc.text('Amount Due:', labelX, y);
      this.doc.text(
        `$${(this.invoice.amount_due || this.invoice.total_amount - this.invoice.amount_paid).toFixed(2)}`,
        valueX,
        y,
        { align: 'right' }
      );
    }

    this.currentY = y + 15;
  }

  private addNotesAndTerms(): void {
    if (this.currentY > this.pageHeight - 80) {
      this.doc.addPage();
      this.currentY = this.margin;
    }

    // Notes
    if (this.invoice.notes) {
      this.doc.setFontSize(10);
      this.doc.setFont('helvetica', 'bold');
      this.doc.setTextColor(0, 0, 0);
      this.doc.text('Notes:', this.margin, this.currentY);
      this.currentY += 6;

      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(9);
      const noteLines = this.doc.splitTextToSize(
        this.invoice.notes,
        this.pageWidth - 2 * this.margin
      );
      noteLines.forEach((line: string) => {
        this.doc.text(line, this.margin, this.currentY);
        this.currentY += 5;
      });
      this.currentY += 5;
    }

    // Terms
    if (this.invoice.terms) {
      this.doc.setFontSize(10);
      this.doc.setFont('helvetica', 'bold');
      this.doc.setTextColor(0, 0, 0);
      this.doc.text('Payment Terms:', this.margin, this.currentY);
      this.currentY += 6;

      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(9);
      const termLines = this.doc.splitTextToSize(
        this.invoice.terms,
        this.pageWidth - 2 * this.margin
      );
      termLines.forEach((line: string) => {
        this.doc.text(line, this.margin, this.currentY);
        this.currentY += 5;
      });
    }
  }

  private addPaymentStatus(): void {
    if (this.invoice.status === 'paid') {
      // Add PAID watermark
      this.doc.setTextColor(34, 197, 94, 0.1);
      this.doc.setFontSize(80);
      this.doc.setFont('helvetica', 'bold');
      this.doc.text('PAID', this.pageWidth / 2, this.pageHeight / 2, {
        align: 'center',
        angle: 45,
      });
    }
  }

  private addFooter(): void {
    const footerY = this.pageHeight - 20;

    // Footer line
    this.doc.setDrawColor(200, 200, 200);
    this.doc.line(this.margin, footerY, this.pageWidth - this.margin, footerY);

    // Footer text
    this.doc.setFontSize(8);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(100, 100, 100);

    const footerText = `Thank you for your business! | ${this.companyInfo.name}`;
    this.doc.text(footerText, this.pageWidth / 2, footerY + 6, { align: 'center' });

    if (this.companyInfo.website) {
      this.doc.text(this.companyInfo.website, this.pageWidth / 2, footerY + 11, {
        align: 'center',
      });
    }

    // Page number
    const pageCount = this.doc.internal.pages.length - 1;
    if (pageCount > 1) {
      this.doc.text(
        `Page ${pageCount}`,
        this.pageWidth - this.margin,
        footerY + 6,
        { align: 'right' }
      );
    }
  }

  private getStatusColor(status: string): { bg: number[]; text: number[] } {
    const colors: Record<string, { bg: number[]; text: number[] }> = {
      draft: { bg: [229, 231, 235], text: [75, 85, 99] },
      sent: { bg: [219, 234, 254], text: [29, 78, 216] },
      viewed: { bg: [254, 249, 195], text: [161, 98, 7] },
      partial: { bg: [254, 243, 199], text: [180, 83, 9] },
      paid: { bg: [220, 252, 231], text: [22, 101, 52] },
      overdue: { bg: [254, 226, 226], text: [185, 28, 28] },
      cancelled: { bg: [229, 231, 235], text: [75, 85, 99] },
    };

    return colors[status.toLowerCase()] || colors.draft;
  }
}

// Convenience function for quick PDF generation
export const generateInvoicePDF = async (
  invoice: InvoiceData,
  companyInfo?: CompanyInfo
): Promise<Blob> => {
  const generator = new InvoicePDFGenerator(invoice, companyInfo);
  return await generator.generatePDF();
};

// Download invoice PDF directly
export const downloadInvoicePDF = (
  invoice: InvoiceData,
  companyInfo?: CompanyInfo,
  filename?: string
): void => {
  const generator = new InvoicePDFGenerator(invoice, companyInfo);
  generator.generatePDF().then(() => {
    generator.download(filename);
  });
};

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

interface EstimateLineItem {
  item_name: string;
  description?: string | null;
  quantity: number;
  unit: string;
  unit_cost: number;
  total_cost?: number | null;
  category?: string | null;
  labor_hours?: number | null;
  labor_rate?: number | null;
  labor_cost?: number | null;
  material_cost?: number | null;
  equipment_cost?: number | null;
}

interface EstimateData {
  estimate_number: string;
  estimate_date: string;
  valid_until?: string | null;
  title: string;
  description?: string | null;
  client_name: string | null;
  client_email: string | null;
  client_phone?: string | null;
  site_address?: string | null;
  status: string;
  markup_percentage?: number | null;
  tax_percentage?: number | null;
  discount_amount?: number | null;
  total_amount: number;
  notes?: string | null;
  terms_and_conditions?: string | null;
  line_items?: EstimateLineItem[];
  project_name?: string | null;
}

interface CompanyInfo {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  license?: string;
}

export class EstimatePDFGenerator {
  private doc: jsPDF;
  private estimate: EstimateData;
  private companyInfo: CompanyInfo;
  private pageWidth: number;
  private pageHeight: number;
  private margin: number;
  private currentY: number;

  constructor(estimate: EstimateData, companyInfo: CompanyInfo = { name: 'BuildDesk' }) {
    this.doc = new jsPDF('portrait', 'mm', 'a4');
    this.estimate = estimate;
    this.companyInfo = {
      name: 'BuildDesk',
      address: '123 Construction Way, Builder City, ST 12345',
      phone: '(555) 123-4567',
      email: 'estimates@builddesk.com',
      website: 'www.builddesk.com',
      license: 'License #123456',
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
      this.addEstimateDetails();

      if (this.estimate.description) {
        this.addProjectDescription();
      }

      this.addLineItemsTable();
      this.addTotalsSection();
      this.addNotesAndTerms();
      this.addAcceptanceSection();
      this.addFooter();
      this.addStatusWatermark();

      return this.doc.output('blob');
    } catch (error) {
      console.error('Error generating estimate PDF:', error);
      throw new Error('Failed to generate estimate PDF');
    }
  }

  public download(filename?: string): void {
    const name = filename || `estimate-${this.estimate.estimate_number}.pdf`;
    this.doc.save(name);
  }

  private addHeader(): void {
    // Company logo area with green accent for proposals
    this.doc.setFillColor(34, 197, 94); // Green for estimates/proposals
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

    // ESTIMATE/PROPOSAL title
    this.doc.setTextColor(0, 0, 0);
    this.doc.setFontSize(28);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('ESTIMATE', this.pageWidth - this.margin, this.margin + 12, {
      align: 'right',
    });

    // Subtitle
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(100, 100, 100);
    this.doc.text('Professional Proposal', this.pageWidth - this.margin, this.margin + 19, {
      align: 'right',
    });

    // Estimate number
    this.doc.setFontSize(11);
    this.doc.setTextColor(0, 0, 0);
    this.doc.text(`#${this.estimate.estimate_number}`, this.pageWidth - this.margin, this.margin + 26, {
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

    if (this.companyInfo.license) {
      this.doc.setTextColor(100, 100, 100);
      this.doc.setFontSize(8);
      this.doc.text(this.companyInfo.license, this.margin, yOffset);
      this.doc.setTextColor(0, 0, 0);
      this.doc.setFontSize(9);
    }

    // PREPARED FOR section (Client)
    const clientX = this.pageWidth / 2 + 5;
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(100, 100, 100);
    this.doc.text('PREPARED FOR:', clientX, startY);

    this.doc.setFontSize(11);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(0, 0, 0);
    this.doc.text(this.estimate.client_name || 'Client Name Not Provided', clientX, startY + 7);

    this.doc.setFontSize(9);
    this.doc.setFont('helvetica', 'normal');
    yOffset = startY + 13;

    if (this.estimate.site_address) {
      const siteAddressLines = this.doc.splitTextToSize(
        this.estimate.site_address,
        columnWidth - 5
      );
      siteAddressLines.forEach((line: string) => {
        this.doc.text(line, clientX, yOffset);
        yOffset += 5;
      });
    }

    if (this.estimate.client_phone) {
      this.doc.text(this.estimate.client_phone, clientX, yOffset);
      yOffset += 5;
    }

    if (this.estimate.client_email) {
      this.doc.text(this.estimate.client_email, clientX, yOffset);
      yOffset += 5;
    }

    if (this.estimate.project_name) {
      this.doc.setFont('helvetica', 'bold');
      this.doc.text('Project:', clientX, yOffset);
      this.doc.setFont('helvetica', 'normal');
      this.doc.text(this.estimate.project_name, clientX + 15, yOffset);
    }

    this.currentY = Math.max(yOffset, startY + 50);
  }

  private addEstimateDetails(): void {
    const startY = this.currentY + 5;

    // Draw background box
    this.doc.setFillColor(236, 253, 245); // Light green
    this.doc.setDrawColor(200, 200, 200);
    this.doc.rect(this.margin, startY, this.pageWidth - 2 * this.margin, 30, 'FD');

    // Title in box
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(0, 0, 0);
    this.doc.text(this.estimate.title, this.margin + 10, startY + 10);

    // Details
    this.doc.setFontSize(9);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(100, 100, 100);

    let leftY = startY + 19;
    const leftX = this.margin + 10;
    const rightX = this.pageWidth / 2 + 5;

    // Left column
    this.doc.text('ESTIMATE DATE:', leftX, leftY);
    this.doc.text('VALID UNTIL:', leftX, leftY + 6);

    // Left column values
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(0, 0, 0);
    this.doc.text(format(new Date(this.estimate.estimate_date), 'MMM dd, yyyy'), leftX + 35, leftY);

    if (this.estimate.valid_until) {
      this.doc.setTextColor(220, 38, 38); // Red for expiration
      this.doc.setFont('helvetica', 'bold');
      this.doc.text(format(new Date(this.estimate.valid_until), 'MMM dd, yyyy'), leftX + 35, leftY + 6);
      this.doc.setTextColor(0, 0, 0);
      this.doc.setFont('helvetica', 'normal');
    } else {
      this.doc.text('No expiration', leftX + 35, leftY + 6);
    }

    // Right column
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(100, 100, 100);
    this.doc.text('STATUS:', rightX, leftY);

    // Status badge
    const statusColor = this.getStatusColor(this.estimate.status);
    this.doc.setFillColor(statusColor.bg[0], statusColor.bg[1], statusColor.bg[2]);
    this.doc.roundedRect(rightX + 20, leftY - 4, 28, 6, 2, 2, 'F');
    this.doc.setTextColor(statusColor.text[0], statusColor.text[1], statusColor.text[2]);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(8);
    this.doc.text(this.estimate.status.toUpperCase(), rightX + 34, leftY, { align: 'center' });

    // Estimated total
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(100, 100, 100);
    this.doc.setFontSize(9);
    this.doc.text('ESTIMATED TOTAL:', rightX, leftY + 9);

    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(34, 197, 94); // Green for estimate
    this.doc.setFontSize(14);
    this.doc.text(`$${this.estimate.total_amount.toFixed(2)}`, rightX + 45, leftY + 9);

    this.currentY = startY + 40;
  }

  private addProjectDescription(): void {
    this.checkPageSpace(30);

    this.doc.setFontSize(11);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(34, 197, 94);
    this.doc.text('Project Scope', this.margin, this.currentY);
    this.currentY += 7;

    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(9);
    this.doc.setTextColor(0, 0, 0);
    const descLines = this.doc.splitTextToSize(
      this.estimate.description!,
      this.pageWidth - 2 * this.margin
    );
    descLines.forEach((line: string) => {
      this.checkPageSpace(10);
      this.doc.text(line, this.margin, this.currentY);
      this.currentY += 5;
    });
    this.currentY += 5;
  }

  private addLineItemsTable(): void {
    this.checkPageSpace(60);

    const headers = [['Item', 'Description', 'Qty', 'Unit', 'Unit Cost', 'Total']];
    const data = (this.estimate.line_items || []).map((item) => {
      const description = item.description || '';
      const costBreakdown: string[] = [];

      if (item.labor_cost && item.labor_cost > 0) {
        costBreakdown.push(`Labor: $${item.labor_cost.toFixed(2)}`);
      }
      if (item.material_cost && item.material_cost > 0) {
        costBreakdown.push(`Materials: $${item.material_cost.toFixed(2)}`);
      }
      if (item.equipment_cost && item.equipment_cost > 0) {
        costBreakdown.push(`Equipment: $${item.equipment_cost.toFixed(2)}`);
      }

      const fullDescription = costBreakdown.length > 0
        ? `${description}\n${costBreakdown.join(', ')}`
        : description;

      return [
        item.item_name,
        fullDescription,
        item.quantity.toString(),
        item.unit,
        `$${item.unit_cost.toFixed(2)}`,
        `$${(item.total_cost || item.quantity * item.unit_cost).toFixed(2)}`,
      ];
    });

    // Group by category if categories exist
    const hasCategories = this.estimate.line_items?.some((item) => item.category);

    if (hasCategories) {
      const categories = new Map<string, typeof data>();
      this.estimate.line_items?.forEach((item, index) => {
        const category = item.category || 'General';
        if (!categories.has(category)) {
          categories.set(category, []);
        }
        categories.get(category)!.push(data[index]);
      });

      // Add category headers and items
      const finalData: any[] = [];
      categories.forEach((items, category) => {
        finalData.push([
          { content: category.toUpperCase(), colSpan: 6, styles: { fillColor: [34, 197, 94], textColor: [255, 255, 255], fontStyle: 'bold' } },
        ]);
        finalData.push(...items);
      });

      autoTable(this.doc, {
        startY: this.currentY,
        head: headers,
        body: finalData,
        margin: { left: this.margin, right: this.margin },
        theme: 'striped',
        headStyles: {
          fillColor: [34, 197, 94],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9,
        },
        bodyStyles: {
          fontSize: 8,
        },
        columnStyles: {
          0: { cellWidth: 35 },
          1: { cellWidth: 'auto' },
          2: { cellWidth: 15, halign: 'center' },
          3: { cellWidth: 18, halign: 'center' },
          4: { cellWidth: 22, halign: 'right' },
          5: { cellWidth: 22, halign: 'right' },
        },
      });
    } else {
      autoTable(this.doc, {
        startY: this.currentY,
        head: headers,
        body: data,
        margin: { left: this.margin, right: this.margin },
        theme: 'striped',
        headStyles: {
          fillColor: [34, 197, 94],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9,
        },
        bodyStyles: {
          fontSize: 8,
        },
        columnStyles: {
          0: { cellWidth: 35 },
          1: { cellWidth: 'auto' },
          2: { cellWidth: 15, halign: 'center' },
          3: { cellWidth: 18, halign: 'center' },
          4: { cellWidth: 22, halign: 'right' },
          5: { cellWidth: 22, halign: 'right' },
        },
      });
    }

    this.currentY = (this.doc as any).lastAutoTable.finalY + 10;
  }

  private addTotalsSection(): void {
    const rightX = this.pageWidth - this.margin - 60;
    const labelX = rightX;
    const valueX = this.pageWidth - this.margin;
    let y = this.currentY;

    this.doc.setFontSize(10);
    this.doc.setTextColor(0, 0, 0);

    // Calculate subtotal before markup
    const subtotalBeforeMarkup = (this.estimate.line_items || []).reduce(
      (sum, item) => sum + (item.total_cost || item.quantity * item.unit_cost),
      0
    );

    // Subtotal
    this.doc.setFont('helvetica', 'normal');
    this.doc.text('Subtotal:', labelX, y);
    this.doc.text(`$${subtotalBeforeMarkup.toFixed(2)}`, valueX, y, { align: 'right' });
    y += 7;

    // Markup
    if (this.estimate.markup_percentage && this.estimate.markup_percentage > 0) {
      const markupAmount = subtotalBeforeMarkup * (this.estimate.markup_percentage / 100);
      this.doc.text(`Markup (${this.estimate.markup_percentage}%):`, labelX, y);
      this.doc.text(`$${markupAmount.toFixed(2)}`, valueX, y, { align: 'right' });
      y += 7;
    }

    // Discount
    if (this.estimate.discount_amount && this.estimate.discount_amount > 0) {
      this.doc.setTextColor(34, 197, 94);
      this.doc.text('Discount:', labelX, y);
      this.doc.text(`-$${this.estimate.discount_amount.toFixed(2)}`, valueX, y, { align: 'right' });
      this.doc.setTextColor(0, 0, 0);
      y += 7;
    }

    // Tax
    if (this.estimate.tax_percentage && this.estimate.tax_percentage > 0) {
      const taxBase = subtotalBeforeMarkup * (1 + (this.estimate.markup_percentage || 0) / 100) - (this.estimate.discount_amount || 0);
      const taxAmount = taxBase * (this.estimate.tax_percentage / 100);
      this.doc.text(`Tax (${this.estimate.tax_percentage}%):`, labelX, y);
      this.doc.text(`$${taxAmount.toFixed(2)}`, valueX, y, { align: 'right' });
      y += 7;
    }

    // Draw line above total
    this.doc.setDrawColor(200, 200, 200);
    this.doc.line(rightX, y, this.pageWidth - this.margin, y);
    y += 5;

    // Total Estimate
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(12);
    this.doc.setTextColor(34, 197, 94);
    this.doc.text('ESTIMATED TOTAL:', labelX, y);
    this.doc.text(`$${this.estimate.total_amount.toFixed(2)}`, valueX, y, { align: 'right' });

    this.currentY = y + 15;
  }

  private addNotesAndTerms(): void {
    if (this.currentY > this.pageHeight - 100) {
      this.doc.addPage();
      this.currentY = this.margin;
    }

    // Notes
    if (this.estimate.notes) {
      this.doc.setFontSize(10);
      this.doc.setFont('helvetica', 'bold');
      this.doc.setTextColor(0, 0, 0);
      this.doc.text('Additional Notes:', this.margin, this.currentY);
      this.currentY += 6;

      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(9);
      const noteLines = this.doc.splitTextToSize(
        this.estimate.notes,
        this.pageWidth - 2 * this.margin
      );
      noteLines.forEach((line: string) => {
        this.doc.text(line, this.margin, this.currentY);
        this.currentY += 5;
      });
      this.currentY += 5;
    }

    // Terms and Conditions
    if (this.estimate.terms_and_conditions) {
      this.checkPageSpace(40);
      this.doc.setFontSize(10);
      this.doc.setFont('helvetica', 'bold');
      this.doc.setTextColor(0, 0, 0);
      this.doc.text('Terms & Conditions:', this.margin, this.currentY);
      this.currentY += 6;

      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(8);
      const termLines = this.doc.splitTextToSize(
        this.estimate.terms_and_conditions,
        this.pageWidth - 2 * this.margin
      );
      termLines.forEach((line: string) => {
        this.checkPageSpace(10);
        this.doc.text(line, this.margin, this.currentY);
        this.currentY += 4;
      });
      this.currentY += 5;
    }
  }

  private addAcceptanceSection(): void {
    this.checkPageSpace(50);

    // Acceptance box
    const boxY = this.currentY;
    this.doc.setDrawColor(34, 197, 94);
    this.doc.setLineWidth(0.5);
    this.doc.rect(this.margin, boxY, this.pageWidth - 2 * this.margin, 40);

    this.doc.setFontSize(11);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(34, 197, 94);
    this.doc.text('ACCEPTANCE', this.margin + 5, boxY + 8);

    this.doc.setFontSize(8);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(0, 0, 0);
    this.doc.text(
      'I accept this estimate and authorize work to begin as outlined above.',
      this.margin + 5,
      boxY + 14
    );

    // Signature line
    const sigLineY = boxY + 25;
    this.doc.setDrawColor(150, 150, 150);
    this.doc.setLineWidth(0.3);
    this.doc.line(this.margin + 5, sigLineY, this.pageWidth / 2 - 5, sigLineY);
    this.doc.setFontSize(8);
    this.doc.setTextColor(100, 100, 100);
    this.doc.text('Signature', this.margin + 5, sigLineY + 4);

    // Date line
    this.doc.line(this.pageWidth / 2 + 5, sigLineY, this.pageWidth - this.margin - 5, sigLineY);
    this.doc.text('Date', this.pageWidth / 2 + 5, sigLineY + 4);

    // Print name line
    const nameLineY = boxY + 35;
    this.doc.line(this.margin + 5, nameLineY, this.pageWidth - this.margin - 5, nameLineY);
    this.doc.text('Print Name', this.margin + 5, nameLineY + 4);

    this.currentY = boxY + 45;
  }

  private addFooter(): void {
    const footerY = this.pageHeight - 20;

    // Footer line
    this.doc.setDrawColor(200, 200, 200);
    this.doc.setLineWidth(0.3);
    this.doc.line(this.margin, footerY, this.pageWidth - this.margin, footerY);

    // Footer text
    this.doc.setFontSize(8);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(100, 100, 100);

    const footerText = `This estimate is valid until ${
      this.estimate.valid_until
        ? format(new Date(this.estimate.valid_until), 'MMM dd, yyyy')
        : 'acceptance'
    } | ${this.companyInfo.name}`;
    this.doc.text(footerText, this.pageWidth / 2, footerY + 6, { align: 'center' });

    if (this.companyInfo.website) {
      this.doc.text(this.companyInfo.website, this.pageWidth / 2, footerY + 11, {
        align: 'center',
      });
    }

    // Page number
    const pageCount = this.doc.internal.pages.length - 1;
    if (pageCount > 1) {
      this.doc.text(`Page ${pageCount}`, this.pageWidth - this.margin, footerY + 6, {
        align: 'right',
      });
    }
  }

  private addStatusWatermark(): void {
    if (this.estimate.status === 'accepted') {
      // Add ACCEPTED watermark
      this.doc.setTextColor(34, 197, 94, 0.1);
      this.doc.setFontSize(80);
      this.doc.setFont('helvetica', 'bold');
      this.doc.text('ACCEPTED', this.pageWidth / 2, this.pageHeight / 2, {
        align: 'center',
        angle: 45,
      });
    } else if (this.estimate.status === 'rejected') {
      // Add DECLINED watermark
      this.doc.setTextColor(239, 68, 68, 0.1);
      this.doc.setFontSize(80);
      this.doc.setFont('helvetica', 'bold');
      this.doc.text('DECLINED', this.pageWidth / 2, this.pageHeight / 2, {
        align: 'center',
        angle: 45,
      });
    }
  }

  private checkPageSpace(spaceNeeded: number): void {
    if (this.currentY + spaceNeeded > this.pageHeight - 30) {
      this.doc.addPage();
      this.currentY = this.margin;
    }
  }

  private getStatusColor(status: string): { bg: number[]; text: number[] } {
    const colors: Record<string, { bg: number[]; text: number[] }> = {
      draft: { bg: [229, 231, 235], text: [75, 85, 99] },
      sent: { bg: [219, 234, 254], text: [29, 78, 216] },
      viewed: { bg: [254, 249, 195], text: [161, 98, 7] },
      accepted: { bg: [220, 252, 231], text: [22, 101, 52] },
      rejected: { bg: [254, 226, 226], text: [185, 28, 28] },
      expired: { bg: [229, 231, 235], text: [75, 85, 99] },
    };

    return colors[status.toLowerCase()] || colors.draft;
  }
}

// Convenience function for quick PDF generation
export const generateEstimatePDF = async (
  estimate: EstimateData,
  companyInfo?: CompanyInfo
): Promise<Blob> => {
  const generator = new EstimatePDFGenerator(estimate, companyInfo);
  return await generator.generatePDF();
};

// Download estimate PDF directly
export const downloadEstimatePDF = (
  estimate: EstimateData,
  companyInfo?: CompanyInfo,
  filename?: string
): void => {
  const generator = new EstimatePDFGenerator(estimate, companyInfo);
  generator.generatePDF().then(() => {
    generator.download(filename);
  });
};

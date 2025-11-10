/**
 * PDF Report Generator for Profitability Calculator
 * Generates professional PDF reports with branding
 */

import jsPDF from 'jspdf';
import type { CalculatorInputs, CalculatorResults } from './profitabilityCalculations';
import { formatCurrency, formatPercentage } from './profitabilityCalculations';

export interface PDFOptions {
  includeWatermark?: boolean;
  includeQRCode?: boolean;
}

/**
 * Generate PDF report for profitability calculation
 */
export async function generateProfitabilityPDF(
  inputs: CalculatorInputs,
  results: CalculatorResults,
  options: PDFOptions = { includeWatermark: true, includeQRCode: true }
): Promise<Blob> {
  const doc = new jsPDF();

  // Page dimensions
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let yPos = margin;

  // Helper function to add new page if needed
  const checkPageBreak = (requiredSpace: number) => {
    if (yPos + requiredSpace > pageHeight - margin) {
      doc.addPage();
      yPos = margin;
      addHeader();
      return true;
    }
    return false;
  };

  // Header with BuildDesk branding
  const addHeader = () => {
    // Logo area (placeholder - replace with actual logo)
    doc.setFillColor(37, 99, 235); // Blue
    doc.rect(margin, yPos, 50, 12, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('BuildDesk', margin + 5, yPos + 8);

    // Title
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(20);
    doc.text('Project Profitability Report', pageWidth - margin, yPos + 8, { align: 'right' });

    // Date
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    const dateStr = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    doc.text(dateStr, pageWidth - margin, yPos + 15, { align: 'right' });

    yPos += 25;
  };

  // Initial header
  addHeader();

  // Divider line
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 10;

  // Project Information Section
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(37, 99, 235);
  doc.text('Project Information', margin, yPos);
  yPos += 8;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);

  const projectInfo = [
    ['Project Type:', inputs.projectType],
    ['Labor Hours:', inputs.laborHours.toLocaleString()],
    ['Material Cost:', formatCurrency(inputs.materialCost)],
    ['Crew Size:', inputs.crewSize.toString()],
    ['Project Duration:', `${inputs.projectDuration} days`]
  ];

  projectInfo.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label, margin, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(value, margin + 50, yPos);
    yPos += 6;
  });

  yPos += 10;
  checkPageBreak(60);

  // Financial Summary Section
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(37, 99, 235);
  doc.text('Financial Summary', margin, yPos);
  yPos += 8;

  // Highlighted boxes for key metrics
  const boxWidth = (pageWidth - 2 * margin - 10) / 3;
  const boxHeight = 25;
  const boxY = yPos;

  // Recommended Bid Box
  doc.setFillColor(240, 253, 244); // Light green
  doc.roundedRect(margin, boxY, boxWidth, boxHeight, 3, 3, 'F');
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text('Recommended Bid', margin + boxWidth / 2, boxY + 8, { align: 'center' });
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(22, 163, 74); // Green
  doc.text(formatCurrency(results.recommendedBid), margin + boxWidth / 2, boxY + 18, { align: 'center' });

  // Profit Margin Box
  const marginColor = results.profitMargin >= 20 ? [22, 163, 74] : results.profitMargin >= 10 ? [234, 179, 8] : [239, 68, 68];
  const marginBgColor = results.profitMargin >= 20 ? [240, 253, 244] : results.profitMargin >= 10 ? [254, 252, 232] : [254, 242, 242];

  doc.setFillColor(...marginBgColor);
  doc.roundedRect(margin + boxWidth + 5, boxY, boxWidth, boxHeight, 3, 3, 'F');
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text('Profit Margin', margin + boxWidth + 5 + boxWidth / 2, boxY + 8, { align: 'center' });
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...marginColor);
  doc.text(formatPercentage(results.profitMargin), margin + boxWidth + 5 + boxWidth / 2, boxY + 18, { align: 'center' });

  // Profit Amount Box
  doc.setFillColor(239, 246, 255); // Light blue
  doc.roundedRect(margin + 2 * (boxWidth + 5), boxY, boxWidth, boxHeight, 3, 3, 'F');
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text('Profit Amount', margin + 2 * (boxWidth + 5) + boxWidth / 2, boxY + 8, { align: 'center' });
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(37, 99, 235); // Blue
  doc.text(formatCurrency(results.profitAmount), margin + 2 * (boxWidth + 5) + boxWidth / 2, boxY + 18, { align: 'center' });

  yPos = boxY + boxHeight + 15;
  checkPageBreak(40);

  // Detailed Breakdown
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);

  const breakdown = [
    ['Total Labor Cost:', formatCurrency(results.totalLaborCost)],
    ['Material Cost:', formatCurrency(inputs.materialCost)],
    ['Overhead (13%):', formatCurrency(results.totalOverhead)],
    ['Break-Even Amount:', formatCurrency(results.breakEvenAmount)],
    ['', ''],
    ['Hourly Rate (per crew):', formatCurrency(results.hourlyRate)],
    ['Material/Labor Ratio:', results.materialToLaborRatio.toFixed(2)]
  ];

  breakdown.forEach(([label, value]) => {
    if (label === '') {
      yPos += 3;
      return;
    }
    doc.setFont('helvetica', 'bold');
    doc.text(label, margin, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(value, pageWidth - margin, yPos, { align: 'right' });
    yPos += 6;
  });

  yPos += 10;
  checkPageBreak(50);

  // Industry Benchmark Comparison
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(37, 99, 235);
  doc.text('Industry Benchmark Comparison', margin, yPos);
  yPos += 8;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);

  const benchmark = [
    ['Industry Average Margin:', formatPercentage(results.benchmarkComparison.industryAvgMargin)],
    ['Your Margin:', formatPercentage(results.benchmarkComparison.yourMargin)],
    ['Difference:', formatPercentage(results.benchmarkComparison.difference, 1) + ' ' + (results.benchmarkComparison.difference >= 0 ? '↑' : '↓')],
    ['Performance:', results.benchmarkComparison.performanceLevel]
  ];

  benchmark.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label, margin, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(value, margin + 70, yPos);
    yPos += 6;
  });

  yPos += 10;
  checkPageBreak(60);

  // Risk Assessment
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(37, 99, 235);
  doc.text('Risk Assessment', margin, yPos);
  yPos += 8;

  const riskColor = results.riskLevel === 'low' ? [34, 197, 94] : results.riskLevel === 'medium' ? [245, 158, 11] : [239, 68, 68];
  doc.setFontSize(12);
  doc.setTextColor(...riskColor);
  doc.setFont('helvetica', 'bold');
  doc.text(`Risk Level: ${results.riskLevel.toUpperCase()} (${results.riskScore}/10)`, margin, yPos);
  yPos += 10;

  // Warnings
  if (results.warnings.length > 0) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(239, 68, 68);
    doc.text('⚠ Warnings:', margin, yPos);
    yPos += 6;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    results.warnings.forEach(warning => {
      const lines = doc.splitTextToSize(warning, pageWidth - 2 * margin - 5);
      lines.forEach((line: string) => {
        checkPageBreak(7);
        doc.text('• ' + line, margin + 5, yPos);
        yPos += 6;
      });
    });
    yPos += 5;
  }

  checkPageBreak(40);

  // Recommendations
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(37, 99, 235);
  doc.text('Recommendations', margin, yPos);
  yPos += 8;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);

  results.recommendations.forEach((rec, index) => {
    checkPageBreak(15);
    const lines = doc.splitTextToSize(`${index + 1}. ${rec}`, pageWidth - 2 * margin);
    lines.forEach((line: string) => {
      doc.text(line, margin, yPos);
      yPos += 6;
    });
    yPos += 2;
  });

  yPos += 10;

  // Call to Action Section
  checkPageBreak(60);
  doc.setFillColor(239, 246, 255);
  doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 45, 3, 3, 'F');

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(37, 99, 235);
  doc.text('Track Every Project Automatically with BuildDesk', margin + 10, yPos + 12);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text('You calculated profit for 1 project. What if you could track ALL projects', margin + 10, yPos + 22);
  doc.text('automatically in real-time?', margin + 10, yPos + 28);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(37, 99, 235);
  doc.text('Start your 14-day free trial at build-desk.com', margin + 10, yPos + 38);

  yPos += 50;

  // Footer on all pages
  const addFooter = () => {
    const footerY = pageHeight - 15;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150, 150, 150);
    doc.text('Created with BuildDesk.com - Free Profitability Calculator', pageWidth / 2, footerY, { align: 'center' });

    if (options.includeQRCode) {
      doc.setFontSize(8);
      doc.text('Scan to access calculator:', pageWidth - margin - 30, footerY - 25);
      // Placeholder for QR code - would integrate actual QR generation library
      doc.setDrawColor(150, 150, 150);
      doc.rect(pageWidth - margin - 28, footerY - 23, 20, 20);
      doc.setFontSize(6);
      doc.text('build-desk.com/calculator', pageWidth - margin - 18, footerY - 10, { align: 'center' });
    }
  };

  // Add footer to all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter();
  }

  // Convert to blob
  return doc.output('blob');
}

/**
 * Download PDF file
 */
export function downloadPDF(blob: Blob, filename: string = 'project-profitability-report.pdf'): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate and download PDF in one step
 */
export async function generateAndDownloadPDF(
  inputs: CalculatorInputs,
  results: CalculatorResults,
  options?: PDFOptions
): Promise<void> {
  const blob = await generateProfitabilityPDF(inputs, results, options);
  const filename = `profitability-report-${inputs.projectType.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.pdf`;
  downloadPDF(blob, filename);
}

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Project, Task } from '@/types/schedule';

interface PDFExportOptions {
  includeGantt?: boolean;
  includeCriticalPath?: boolean;
  includeTaskList?: boolean;
  includeAnalytics?: boolean;
  companyName?: string;
  projectDescription?: string;
}

export class SchedulePDFExporter {
  private doc: jsPDF;
  private project: Project;
  private options: PDFExportOptions;
  private pageWidth: number;
  private pageHeight: number;
  private margin: number;
  private currentY: number;

  constructor(project: Project, options: PDFExportOptions = {}) {
    this.doc = new jsPDF('landscape', 'mm', 'a4');
    this.project = project;
    this.options = {
      includeGantt: true,
      includeCriticalPath: true,
      includeTaskList: true,
      includeAnalytics: true,
      companyName: 'BuildDesk',
      ...options
    };
    
    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.pageHeight = this.doc.internal.pageSize.getHeight();
    this.margin = 15;
    this.currentY = this.margin;
  }

  public async generatePDF(): Promise<void> {
    try {
      // Add header and project info
      this.addHeader();
      this.addProjectInfo();
      
      // Add different sections based on options
      if (this.options.includeAnalytics) {
        this.addAnalyticsSection();
      }
      
      if (this.options.includeTaskList) {
        this.addTaskListTable();
      }
      
      if (this.options.includeCriticalPath) {
        this.addCriticalPathSection();
      }
      
      if (this.options.includeGantt) {
        this.addGanttChart();
      }
      
      // Add footer
      this.addFooter();
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw new Error('Failed to generate PDF');
    }
  }

  private addHeader(): void {
    const now = new Date();
    
    // Company logo area (placeholder)
    this.doc.setFillColor(37, 99, 235); // Blue color
    this.doc.rect(this.margin, this.margin, 30, 20, 'F');
    
    // Company name
    this.doc.setTextColor(255, 255, 255);
    this.doc.setFontSize(14);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(this.options.companyName || 'BuildDesk', this.margin + 2, this.margin + 8);
    
    this.doc.setTextColor(255, 255, 255);
    this.doc.setFontSize(8);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text('Construction Management', this.margin + 2, this.margin + 14);
    
    // Document title
    this.doc.setTextColor(0, 0, 0);
    this.doc.setFontSize(20);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Project Schedule Report', this.pageWidth / 2, this.margin + 15, { align: 'center' });
    
    // Date generated
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(`Generated: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`, 
                  this.pageWidth - this.margin, this.margin + 8, { align: 'right' });
    
    this.currentY = this.margin + 35;
  }

  private addProjectInfo(): void {
    const startY = this.currentY;
    
    // Project info box
    this.doc.setDrawColor(200, 200, 200);
    this.doc.setFillColor(248, 250, 252);
    this.doc.rect(this.margin, startY, this.pageWidth - (2 * this.margin), 35, 'FD');
    
    // Project details
    this.doc.setTextColor(0, 0, 0);
    this.doc.setFontSize(16);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(`Project: ${this.project.name}`, this.margin + 10, startY + 12);
    
    this.doc.setFontSize(11);
    this.doc.setFont('helvetica', 'normal');
    
    const projectDuration = Math.ceil(
      (new Date(this.project.endDate).getTime() - new Date(this.project.startDate).getTime()) 
      / (1000 * 60 * 60 * 24)
    );
    
    const details = [
      `Start Date: ${new Date(this.project.startDate).toLocaleDateString()}`,
      `End Date: ${new Date(this.project.endDate).toLocaleDateString()}`,
      `Duration: ${projectDuration} days`,
      `Total Tasks: ${this.project.tasks.length}`,
      `Critical Path Tasks: ${this.project.tasks.filter(t => t.isOnCriticalPath).length}`
    ];
    
    let detailY = startY + 22;
    let detailX = this.margin + 10;
    
    details.forEach((detail, index) => {
      if (index === 3) {
        detailX = this.pageWidth / 2 + 10;
        detailY = startY + 22;
      }
      this.doc.text(detail, detailX, detailY);
      detailY += 6;
    });
    
    this.currentY = startY + 45;
  }

  private addAnalyticsSection(): void {
    this.checkPageSpace(60);
    
    // Section header
    this.doc.setFontSize(14);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(37, 99, 235);
    this.doc.text('Project Analytics', this.margin, this.currentY);
    
    this.currentY += 10;
    
    // Analytics cards
    const analytics = this.calculateAnalytics();
    const cardWidth = (this.pageWidth - (2 * this.margin) - 30) / 4;
    const cardHeight = 25;
    
    analytics.forEach((metric, index) => {
      const x = this.margin + (index * (cardWidth + 10));
      
      // Card background
      this.doc.setFillColor(metric.color[0], metric.color[1], metric.color[2]);
      this.doc.rect(x, this.currentY, cardWidth, cardHeight, 'F');
      
      // Card content
      this.doc.setTextColor(255, 255, 255);
      this.doc.setFontSize(18);
      this.doc.setFont('helvetica', 'bold');
      this.doc.text(metric.value, x + cardWidth/2, this.currentY + 12, { align: 'center' });
      
      this.doc.setFontSize(9);
      this.doc.setFont('helvetica', 'normal');
      this.doc.text(metric.label, x + cardWidth/2, this.currentY + 20, { align: 'center' });
    });
    
    this.currentY += cardHeight + 15;
  }

  private addTaskListTable(): void {
    this.checkPageSpace(80);
    
    // Section header
    this.doc.setTextColor(0, 0, 0);
    this.doc.setFontSize(14);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Task List', this.margin, this.currentY);
    
    this.currentY += 5;
    
    // Prepare table data
    const tableData = this.project.tasks.map(task => [
      task.name,
      task.phase,
      `${task.duration} days`,
      new Date(task.startDate).toLocaleDateString(),
      new Date(task.endDate).toLocaleDateString(),
      task.status.replace('-', ' ').toUpperCase(),
      task.isOnCriticalPath ? 'Yes' : 'No'
    ]);
    
    // Generate table
    autoTable(this.doc, {
      startY: this.currentY,
      head: [['Task Name', 'Phase', 'Duration', 'Start Date', 'End Date', 'Status', 'Critical Path']],
      body: tableData,
      styles: {
        fontSize: 8,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [37, 99, 235],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        0: { cellWidth: 50 }, // Task Name
        1: { cellWidth: 25 }, // Phase
        2: { cellWidth: 20 }, // Duration
        3: { cellWidth: 25 }, // Start Date
        4: { cellWidth: 25 }, // End Date
        5: { cellWidth: 20 }, // Status
        6: { cellWidth: 20 }, // Critical Path
      },
      didDrawCell: (data) => {
        // Highlight critical path tasks
        if (data.column.index === 6 && data.cell.text[0] === 'Yes') {
          this.doc.setFillColor(220, 38, 38);
          this.doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
          this.doc.setTextColor(255, 255, 255);
          this.doc.text('Yes', data.cell.x + data.cell.width/2, data.cell.y + data.cell.height/2 + 1, { align: 'center' });
        }
      }
    });
    
    this.currentY = (this.doc as any).lastAutoTable.finalY + 15;
  }

  private addCriticalPathSection(): void {
    this.checkPageSpace(60);
    
    const criticalTasks = this.project.tasks.filter(task => task.isOnCriticalPath);
    
    if (criticalTasks.length === 0) return;
    
    // Section header
    this.doc.setFontSize(14);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(220, 38, 38);
    this.doc.text('Critical Path Analysis', this.margin, this.currentY);
    
    this.currentY += 10;
    
    // Critical path info box
    this.doc.setDrawColor(220, 38, 38);
    this.doc.setFillColor(254, 242, 242);
    this.doc.rect(this.margin, this.currentY, this.pageWidth - (2 * this.margin), 30, 'FD');
    
    this.doc.setTextColor(0, 0, 0);
    this.doc.setFontSize(11);
    this.doc.setFont('helvetica', 'normal');
    
    const criticalPathDuration = criticalTasks.reduce((sum, task) => sum + task.duration, 0);
    
    this.doc.text(`Critical Path Duration: ${criticalPathDuration} days`, this.margin + 10, this.currentY + 10);
    this.doc.text(`Critical Path Tasks: ${criticalTasks.length}`, this.margin + 10, this.currentY + 18);
    this.doc.text('These tasks directly impact the project completion date.', this.margin + 10, this.currentY + 26);
    
    // List critical tasks
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Critical Tasks:', this.pageWidth / 2 + 10, this.currentY + 10);
    
    this.doc.setFont('helvetica', 'normal');
    let listY = this.currentY + 18;
    criticalTasks.slice(0, 3).forEach((task, index) => {
      this.doc.text(`• ${task.name}`, this.pageWidth / 2 + 10, listY);
      listY += 4;
    });
    
    if (criticalTasks.length > 3) {
      this.doc.text(`... and ${criticalTasks.length - 3} more`, this.pageWidth / 2 + 10, listY);
    }
    
    this.currentY += 40;
  }

  private addGanttChart(): void {
    this.checkPageSpace(100);
    
    // Section header
    this.doc.setTextColor(0, 0, 0);
    this.doc.setFontSize(14);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Project Timeline (Gantt Chart)', this.margin, this.currentY);
    
    this.currentY += 10;
    
    // Calculate timeline parameters
    const startDate = new Date(this.project.startDate);
    const endDate = new Date(this.project.endDate);
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    const chartWidth = this.pageWidth - (2 * this.margin) - 80; // Leave space for task names
    const chartHeight = Math.min(this.project.tasks.length * 8 + 20, 120); // Max height limit
    const dayWidth = chartWidth / totalDays;
    const taskHeight = 6;
    const taskSpacing = 2;
    
    // Draw timeline header
    this.doc.setFillColor(240, 240, 240);
    this.doc.rect(this.margin + 80, this.currentY, chartWidth, 15, 'F');
    
    // Draw week markers
    this.doc.setFontSize(8);
    this.doc.setTextColor(100, 100, 100);
    for (let week = 0; week * 7 < totalDays; week++) {
      const x = this.margin + 80 + (week * 7 * dayWidth);
      if (x < this.margin + 80 + chartWidth - 20) {
        this.doc.text(`Week ${week + 1}`, x + 2, this.currentY + 10);
        this.doc.setDrawColor(200, 200, 200);
        this.doc.line(x, this.currentY, x, this.currentY + chartHeight);
      }
    }
    
    this.currentY += 15;
    
    // Draw tasks
    this.project.tasks.slice(0, 15).forEach((task, index) => { // Limit to 15 tasks for space
      const taskY = this.currentY + (index * (taskHeight + taskSpacing));
      
      // Task name
      this.doc.setTextColor(0, 0, 0);
      this.doc.setFontSize(8);
      this.doc.setFont('helvetica', 'normal');
      const taskName = task.name.length > 25 ? task.name.substring(0, 22) + '...' : task.name;
      this.doc.text(taskName, this.margin, taskY + 4);
      
      // Calculate task bar position
      const taskStart = Math.floor((new Date(task.startDate).getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const taskBarX = this.margin + 80 + (taskStart * dayWidth);
      const taskBarWidth = task.duration * dayWidth;
      
      // Task bar
      if (task.isOnCriticalPath) {
        this.doc.setFillColor(220, 38, 38); // Red for critical path
      } else {
        this.doc.setFillColor(59, 130, 246); // Blue for regular tasks
      }
      
      this.doc.rect(taskBarX, taskY, Math.max(taskBarWidth, 2), taskHeight, 'F');
      
      // Task duration text
      if (taskBarWidth > 15) {
        this.doc.setTextColor(255, 255, 255);
        this.doc.setFontSize(6);
        this.doc.text(`${task.duration}d`, taskBarX + taskBarWidth/2, taskY + 4, { align: 'center' });
      }
    });
    
    // Legend
    const legendY = this.currentY + chartHeight - 30;
    this.doc.setFillColor(220, 38, 38);
    this.doc.rect(this.margin, legendY, 8, 4, 'F');
    this.doc.setTextColor(0, 0, 0);
    this.doc.setFontSize(8);
    this.doc.text('Critical Path', this.margin + 12, legendY + 3);
    
    this.doc.setFillColor(59, 130, 246);
    this.doc.rect(this.margin + 70, legendY, 8, 4, 'F');
    this.doc.text('Regular Tasks', this.margin + 82, legendY + 3);
    
    if (this.project.tasks.length > 15) {
      this.doc.setFontSize(8);
      this.doc.setTextColor(100, 100, 100);
      this.doc.text(`* Showing first 15 of ${this.project.tasks.length} tasks`, this.margin, legendY + 12);
    }
    
    this.currentY += chartHeight + 10;
  }

  private addFooter(): void {
    const footerY = this.pageHeight - 20;
    
    // Footer line
    this.doc.setDrawColor(200, 200, 200);
    this.doc.line(this.margin, footerY, this.pageWidth - this.margin, footerY);
    
    // Footer text
    this.doc.setTextColor(100, 100, 100);
    this.doc.setFontSize(8);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text('Generated by BuildDesk Construction Management Platform', this.margin, footerY + 8);
    this.doc.text(`Page 1 of 1`, this.pageWidth - this.margin, footerY + 8, { align: 'right' });
    this.doc.text('www.builddesk.com', this.pageWidth / 2, footerY + 8, { align: 'center' });
  }

  private checkPageSpace(requiredSpace: number): void {
    if (this.currentY + requiredSpace > this.pageHeight - 30) {
      this.doc.addPage();
      this.currentY = this.margin;
    }
  }

  private calculateAnalytics() {
    const totalTasks = this.project.tasks.length;
    const criticalPathTasks = this.project.tasks.filter(t => t.isOnCriticalPath).length;
    const completedTasks = this.project.tasks.filter(t => t.status === 'completed').length;
    const projectDuration = Math.ceil(
      (new Date(this.project.endDate).getTime() - new Date(this.project.startDate).getTime()) 
      / (1000 * 60 * 60 * 24)
    );
    
    return [
      {
        value: totalTasks.toString(),
        label: 'Total Tasks',
        color: [59, 130, 246] // Blue
      },
      {
        value: criticalPathTasks.toString(),
        label: 'Critical Tasks',
        color: [220, 38, 38] // Red
      },
      {
        value: `${Math.round((completedTasks / totalTasks) * 100)}%`,
        label: 'Completion',
        color: [34, 197, 94] // Green
      },
      {
        value: `${projectDuration}`,
        label: 'Duration (Days)',
        color: [251, 146, 60] // Orange
      }
    ];
  }

  public downloadPDF(filename?: string): void {
    const fileName = filename || `${this.project.name.replace(/\s+/g, '_')}_Schedule.pdf`;
    this.doc.save(fileName);
  }

  public getPDFBlob(): Blob {
    return this.doc.output('blob');
  }

  public getPDFDataUri(): string {
    return this.doc.output('datauristring');
  }
}
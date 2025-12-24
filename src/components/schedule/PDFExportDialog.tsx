import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Download, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Project } from '@/types/schedule';

interface PDFExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  templateName?: string;
}

interface ExportOptions {
  includeGantt: boolean;
  includeCriticalPath: boolean;
  includeTaskList: boolean;
  includeAnalytics: boolean;
  companyName: string;
  fileName: string;
}

export function PDFExportDialog({ isOpen, onClose, project, templateName }: PDFExportDialogProps) {
  const [options, setOptions] = useState<ExportOptions>({
    includeGantt: true,
    includeCriticalPath: true,
    includeTaskList: true,
    includeAnalytics: true,
    companyName: 'BuildDesk',
    fileName: `${project.name.replace(/\s+/g, '_')}_Schedule`
  });
  
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatus, setExportStatus] = useState<'idle' | 'generating' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleOptionChange = (key: keyof ExportOptions, value: boolean | string) => {
    setOptions(prev => ({ ...prev, [key]: value }));
  };

  const simulateProgress = () => {
    setExportProgress(0);
    const intervals = [
      { progress: 25, delay: 300, message: 'Preparing project data...' },
      { progress: 50, delay: 500, message: 'Generating charts...' },
      { progress: 75, delay: 400, message: 'Creating PDF document...' },
      { progress: 100, delay: 300, message: 'Finalizing export...' }
    ];

    let currentDelay = 0;
    intervals.forEach(({ progress, delay }) => {
      currentDelay += delay;
      setTimeout(() => {
        setExportProgress(progress);
      }, currentDelay);
    });

    return currentDelay;
  };

  const handleExport = async () => {
    setIsExporting(true);
    setExportStatus('generating');
    setErrorMessage('');

    try {
      // Simulate progress
      const totalDelay = simulateProgress();

      // Wait for progress simulation to complete
      await new Promise(resolve => setTimeout(resolve, totalDelay));

      // Dynamically import PDF exporter to reduce bundle size
      const { SchedulePDFExporter } = await import('@/utils/pdfExportUtils');

      // Create and configure PDF exporter
      const exporter = new SchedulePDFExporter(project, {
        includeGantt: options.includeGantt,
        includeCriticalPath: options.includeCriticalPath,
        includeTaskList: options.includeTaskList,
        includeAnalytics: options.includeAnalytics,
        companyName: options.companyName,
        projectDescription: templateName
      });

      // Generate PDF
      await exporter.generatePDF();

      // Download PDF
      const fileName = `${options.fileName}.pdf`;
      exporter.downloadPDF(fileName);

      setExportStatus('success');
      
      // Auto-close dialog after success
      setTimeout(() => {
        onClose();
        setExportStatus('idle');
        setExportProgress(0);
      }, 2000);

    } catch (error) {
      console.error('PDF export error:', error);
      setExportStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Failed to generate PDF');
    } finally {
      setIsExporting(false);
    }
  };

  const handleClose = () => {
    if (!isExporting) {
      onClose();
      setExportStatus('idle');
      setExportProgress(0);
      setErrorMessage('');
    }
  };

  const getStatusIcon = () => {
    switch (exportStatus) {
      case 'generating':
        return <Loader2 className="h-6 w-6 animate-spin text-blue-600" />;
      case 'success':
        return <CheckCircle className="h-6 w-6 text-green-600" />;
      case 'error':
        return <AlertCircle className="h-6 w-6 text-red-600" />;
      default:
        return <FileText className="h-6 w-6 text-gray-600" />;
    }
  };

  const getStatusMessage = () => {
    switch (exportStatus) {
      case 'generating':
        return 'Generating your PDF schedule...';
      case 'success':
        return 'PDF generated successfully! Download started.';
      case 'error':
        return `Error: ${errorMessage}`;
      default:
        return 'Configure your PDF export options below';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getStatusIcon()}
            Export Project Schedule
          </DialogTitle>
          <DialogDescription>
            {getStatusMessage()}
          </DialogDescription>
        </DialogHeader>

        {exportStatus === 'generating' && (
          <div className="space-y-4">
            <Progress value={exportProgress} className="w-full" />
            <p className="text-sm text-muted-foreground text-center">
              {exportProgress < 100 ? 'Please wait while we prepare your PDF...' : 'Almost done!'}
            </p>
          </div>
        )}

        {exportStatus === 'idle' && (
          <div className="space-y-6">
            {/* File Name */}
            <div className="space-y-2">
              <Label htmlFor="fileName">File Name</Label>
              <Input
                id="fileName"
                value={options.fileName}
                onChange={(e) => handleOptionChange('fileName', e.target.value)}
                placeholder="Enter file name"
              />
            </div>

            {/* Company Name */}
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                value={options.companyName}
                onChange={(e) => handleOptionChange('companyName', e.target.value)}
                placeholder="Your company name"
              />
            </div>

            {/* Export Options */}
            <div className="space-y-4">
              <Label className="text-base font-medium">Include in PDF:</Label>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeGantt"
                    checked={options.includeGantt}
                    onCheckedChange={(checked) => handleOptionChange('includeGantt', checked as boolean)}
                  />
                  <Label htmlFor="includeGantt" className="text-sm">
                    Gantt Chart Timeline
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeTaskList"
                    checked={options.includeTaskList}
                    onCheckedChange={(checked) => handleOptionChange('includeTaskList', checked as boolean)}
                  />
                  <Label htmlFor="includeTaskList" className="text-sm">
                    Detailed Task List
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeCriticalPath"
                    checked={options.includeCriticalPath}
                    onCheckedChange={(checked) => handleOptionChange('includeCriticalPath', checked as boolean)}
                  />
                  <Label htmlFor="includeCriticalPath" className="text-sm">
                    Critical Path Analysis
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeAnalytics"
                    checked={options.includeAnalytics}
                    onCheckedChange={(checked) => handleOptionChange('includeAnalytics', checked as boolean)}
                  />
                  <Label htmlFor="includeAnalytics" className="text-sm">
                    Project Analytics & Metrics
                  </Label>
                </div>
              </div>
            </div>

            {/* Project Summary */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-sm mb-2">Project Summary:</h4>
              <div className="text-sm text-gray-600 space-y-1">
                <p><strong>Project:</strong> {project.name}</p>
                <p><strong>Tasks:</strong> {project.tasks.length}</p>
                <p><strong>Critical Path Tasks:</strong> {project.tasks.filter(t => t.isOnCriticalPath).length}</p>
                <p><strong>Duration:</strong> {Math.ceil((new Date(project.endDate).getTime() - new Date(project.startDate).getTime()) / (1000 * 60 * 60 * 24))} days</p>
              </div>
            </div>
          </div>
        )}

        {exportStatus === 'success' && (
          <div className="text-center py-6">
            <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-green-900 mb-2">Export Successful!</h3>
            <p className="text-sm text-gray-600">
              Your PDF has been generated and the download should start automatically.
            </p>
          </div>
        )}

        {exportStatus === 'error' && (
          <div className="text-center py-6">
            <AlertCircle className="h-16 w-16 text-red-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-red-900 mb-2">Export Failed</h3>
            <p className="text-sm text-gray-600 mb-4">
              {errorMessage}
            </p>
            <Button 
              onClick={() => setExportStatus('idle')} 
              variant="outline"
            >
              Try Again
            </Button>
          </div>
        )}

        {/* Action Buttons */}
        {exportStatus === 'idle' && (
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={handleExport} disabled={!options.fileName.trim()}>
              <Download className="mr-2 h-4 w-4" />
              Generate PDF
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EstimateCreatedPanelProps {
  estimateNumber: string;
  generatingPDF: boolean;
  onDownloadPDF: () => void;
  onClose: () => void;
}

/** Shown once an estimate has been saved: download its PDF or close the form. */
export function EstimateCreatedPanel({
  estimateNumber,
  generatingPDF,
  onDownloadPDF,
  onClose,
}: EstimateCreatedPanelProps) {
  return (
    <div className="mt-6 pt-6 border-t">
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-green-900 dark:text-green-100 mb-1">
              Estimate Created Successfully!
            </h4>
            <p className="text-sm text-green-700 dark:text-green-300">
              Estimate #{estimateNumber} has been created.
              Download the PDF or close this form.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          <Button
            onClick={onDownloadPDF}
            disabled={generatingPDF}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            <Download className="mr-2 h-4 w-4" />
            {generatingPDF ? 'Generating PDF...' : 'Download PDF'}
          </Button>

          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1"
          >
            Close & View Estimates
          </Button>
        </div>
      </div>
    </div>
  );
}

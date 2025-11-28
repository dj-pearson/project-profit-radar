import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Upload, FileSpreadsheet, Download, Sparkles } from 'lucide-react';
import { SmartImportWizard } from './SmartImportWizard';
import { downloadCSVTemplate, CSV_TEMPLATES } from '@/lib/csv-import/templates';

interface CSVImportButtonProps {
  dataType: string;
  onImportComplete?: () => void;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  showDropdown?: boolean;
  aiEnabled?: boolean;
}

/**
 * Reusable CSV Import Button component
 * Can be used in any module to trigger CSV imports with optional AI analysis
 */
export const CSVImportButton: React.FC<CSVImportButtonProps> = ({
  dataType,
  onImportComplete,
  variant = 'outline',
  size = 'default',
  className = '',
  showDropdown = true,
  aiEnabled = true,
}) => {
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  const template = CSV_TEMPLATES[dataType];
  const displayName = template?.displayName || 'Data';

  const handleImportComplete = () => {
    setIsWizardOpen(false);
    onImportComplete?.();
  };

  const handleDownloadTemplate = () => {
    downloadCSVTemplate(dataType);
  };

  if (!showDropdown) {
    return (
      <>
        <Button
          variant={variant}
          size={size}
          className={className}
          onClick={() => setIsWizardOpen(true)}
        >
          <Upload className="h-4 w-4 mr-2" />
          Import {displayName}
        </Button>

        <SmartImportWizard
          isOpen={isWizardOpen}
          onClose={() => setIsWizardOpen(false)}
          onImportComplete={handleImportComplete}
          defaultDataType={dataType}
          aiImportEnabled={aiEnabled}
        />
      </>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant={variant} size={size} className={className}>
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={() => setIsWizardOpen(true)}>
            {aiEnabled && <Sparkles className="h-4 w-4 mr-2 text-primary" />}
            {!aiEnabled && <FileSpreadsheet className="h-4 w-4 mr-2" />}
            Import {displayName}
            {aiEnabled && (
              <span className="ml-auto text-xs text-muted-foreground">AI</span>
            )}
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={handleDownloadTemplate}>
            <Download className="h-4 w-4 mr-2" />
            Download Template
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <SmartImportWizard
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onImportComplete={handleImportComplete}
        defaultDataType={dataType}
        aiImportEnabled={aiEnabled}
      />
    </>
  );
};

/**
 * Hook to use import functionality programmatically
 */
export const useCSVImport = (dataType: string) => {
  const [isOpen, setIsOpen] = useState(false);

  const openImport = () => setIsOpen(true);
  const closeImport = () => setIsOpen(false);

  const ImportDialog = ({ onComplete }: { onComplete?: () => void }) => (
    <SmartImportWizard
      isOpen={isOpen}
      onClose={closeImport}
      onImportComplete={() => {
        closeImport();
        onComplete?.();
      }}
      defaultDataType={dataType}
      aiImportEnabled={true}
    />
  );

  return {
    openImport,
    closeImport,
    isOpen,
    ImportDialog,
  };
};

export default CSVImportButton;

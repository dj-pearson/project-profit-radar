import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Camera, QrCode, FileText, DollarSign, Zap } from 'lucide-react';
import { PhotoFirstWorkflow } from './PhotoFirstWorkflow';
import { BarcodeQRScanner } from './BarcodeQRScanner';
import { TemplateBasedEntry } from './TemplateBasedEntry';
import { RealTimeCostEntry } from '@/components/financial/RealTimeCostEntry';

interface StreamlinedDataEntryProps {
  onDataSaved: (data: any, type: string) => void;
  onClose: () => void;
  projectId?: string;
}

type EntryMode = 'select' | 'photo' | 'scan' | 'template' | 'cost';

export const StreamlinedDataEntry: React.FC<StreamlinedDataEntryProps> = ({
  onDataSaved,
  onClose,
  projectId = 'default'
}) => {
  const [currentMode, setCurrentMode] = useState<EntryMode>('select');

  const entryOptions = [
    {
      id: 'photo',
      title: 'Photo-First Entry',
      description: 'Take a photo and let AI suggest the details',
      icon: Camera,
      color: 'bg-blue-500',
      features: ['AI categorization', 'Auto-descriptions', 'Location capture']
    },
    {
      id: 'scan',
      title: 'Barcode/QR Scanner',
      description: 'Scan equipment and materials instantly',
      icon: QrCode,
      color: 'bg-green-500',
      features: ['Equipment lookup', 'Material database', 'Quick identification']
    },
    {
      id: 'template',
      title: 'Template Forms',
      description: 'Use pre-built forms for common tasks',
      icon: FileText,
      color: 'bg-purple-500',
      features: ['Smart suggestions', 'Reusable templates', 'Quick completion']
    },
    {
      id: 'cost',
      title: 'Real-Time Costs',
      description: 'Log project costs with photo documentation',
      icon: DollarSign,
      color: 'bg-orange-500',
      features: ['GPS tracking', 'Photo receipts', 'Instant categorization']
    }
  ];

  const handleDataSaved = (data: any) => {
    onDataSaved(data, currentMode);
    setCurrentMode('select');
  };

  const handleCancel = () => {
    if (currentMode === 'select') {
      onClose();
    } else {
      setCurrentMode('select');
    }
  };

  if (currentMode === 'photo') {
    return (
      <PhotoFirstWorkflow
        onSave={handleDataSaved}
        onCancel={handleCancel}
      />
    );
  }

  if (currentMode === 'scan') {
    return (
      <BarcodeQRScanner
        onScanResult={handleDataSaved}
        onCancel={handleCancel}
      />
    );
  }

  if (currentMode === 'template') {
    return (
      <TemplateBasedEntry
        onSave={handleDataSaved}
        onCancel={handleCancel}
        projectId={projectId}
      />
    );
  }

  if (currentMode === 'cost') {
    return (
      <div className="max-w-2xl mx-auto">
        <RealTimeCostEntry
          projectId={projectId}
          onCostAdded={() => {
            handleDataSaved({ type: 'cost_entry', projectId });
          }}
        />
        <div className="mt-4 flex justify-center">
          <Button onClick={handleCancel} variant="outline">
            Back to Options
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-6 w-6" />
          Streamlined Data Entry
        </CardTitle>
        <p className="text-muted-foreground">
          Choose the fastest way to capture your construction data
        </p>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {entryOptions.map((option) => {
            const Icon = option.icon;
            return (
              <Card 
                key={option.id} 
                className="cursor-pointer hover:shadow-lg transition-all duration-200 border-2 hover:border-primary/20"
                onClick={() => setCurrentMode(option.id as EntryMode)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg ${option.color}`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-2">{option.title}</h3>
                      <p className="text-muted-foreground text-sm mb-3">
                        {option.description}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {option.features.map((feature) => (
                          <Badge 
                            key={feature} 
                            variant="secondary" 
                            className="text-xs"
                          >
                            {feature}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <h4 className="font-medium mb-2">Why Use Streamlined Entry?</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• <strong>Save Time:</strong> Reduce data entry by up to 70% with smart forms and AI assistance</li>
            <li>• <strong>Improve Accuracy:</strong> Auto-categorization and templates prevent common errors</li>
            <li>• <strong>Better Documentation:</strong> Photo-first approach captures more context</li>
            <li>• <strong>Field-Friendly:</strong> Designed for mobile use with offline capabilities</li>
          </ul>
        </div>

        <div className="flex justify-center mt-6">
          <Button onClick={onClose} variant="outline">
            Close
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
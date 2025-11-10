/**
 * Equipment QR Label Manager
 * Generate, preview, and print QR code labels for equipment
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  QrCode,
  Download,
  Printer,
  Search,
  CheckSquare,
  Square,
  Loader2,
  AlertCircle,
  RefreshCw,
  Wrench,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  getOrGenerateQRCode,
  batchGenerateQRCodes,
  downloadQRCode,
  type Equipment,
} from '@/services/qrCodeService';

interface EquipmentWithQR extends Equipment {
  qr_code_image?: string;
  qr_code_value?: string;
  qr_code_id?: string;
}

export const EquipmentQRLabelManager: React.FC = () => {
  const { userProfile } = useAuth();
  const [equipment, setEquipment] = useState<EquipmentWithQR[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0 });
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  useEffect(() => {
    loadEquipment();
  }, [userProfile?.company_id]);

  const loadEquipment = async () => {
    if (!userProfile?.company_id) return;

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('equipment')
        .select('*')
        .eq('company_id', userProfile.company_id)
        .order('name');

      if (error) throw error;
      setEquipment((data || []) as EquipmentWithQR[]);
    } catch (error) {
      console.error('Error loading equipment:', error);
      toast.error('Failed to load equipment');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredEquipment.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredEquipment.map((eq) => eq.id)));
    }
  };

  const generateSingleQR = async (equipmentItem: Equipment) => {
    try {
      setIsGenerating(true);
      const result = await getOrGenerateQRCode(equipmentItem);

      if (result.success) {
        // Update equipment list with new QR code
        setEquipment((prev) =>
          prev.map((eq) =>
            eq.id === equipmentItem.id
              ? {
                  ...eq,
                  qr_code_image: result.qr_code_image,
                  qr_code_value: result.qr_code_value,
                  qr_code_id: result.qr_code_id,
                }
              : eq
          )
        );

        toast.success(
          result.existing
            ? `QR code already exists for ${equipmentItem.name}`
            : `QR code generated for ${equipmentItem.name}`
        );
      } else {
        toast.error(result.error || 'Failed to generate QR code');
      }
    } catch (error: any) {
      console.error('Error generating QR code:', error);
      toast.error(error.message || 'Failed to generate QR code');
    } finally {
      setIsGenerating(false);
    }
  };

  const generateBatchQR = async () => {
    if (selectedIds.size === 0) {
      toast.error('Please select equipment to generate QR codes');
      return;
    }

    try {
      setIsGenerating(true);
      const selectedEquipment = equipment.filter((eq) => selectedIds.has(eq.id));

      const result = await batchGenerateQRCodes(selectedEquipment, (current, total) => {
        setGenerationProgress({ current, total });
      });

      // Refresh equipment list to get updated QR codes
      await loadEquipment();

      toast.success(
        `QR codes generated: ${result.success} successful, ${result.failed} failed`
      );

      if (result.failed > 0) {
        console.error('Failed equipment:', result.results.filter((r) => !r.success));
      }
    } catch (error: any) {
      console.error('Error generating batch QR codes:', error);
      toast.error(error.message || 'Failed to generate QR codes');
    } finally {
      setIsGenerating(false);
      setGenerationProgress({ current: 0, total: 0 });
    }
  };

  const downloadSingleQR = (equipmentItem: EquipmentWithQR) => {
    if (!equipmentItem.qr_code_image) {
      toast.error('QR code not generated yet');
      return;
    }

    const filename = `${equipmentItem.name.replace(/\s+/g, '_')}_QR.png`;
    downloadQRCode(equipmentItem.qr_code_image, filename);
    toast.success(`Downloaded QR code for ${equipmentItem.name}`);
  };

  const downloadBatchQR = () => {
    const selectedEquipmentWithQR = equipment.filter(
      (eq) => selectedIds.has(eq.id) && eq.qr_code_image
    );

    if (selectedEquipmentWithQR.length === 0) {
      toast.error('No QR codes available for selected equipment');
      return;
    }

    selectedEquipmentWithQR.forEach((eq) => {
      const filename = `${eq.name.replace(/\s+/g, '_')}_QR.png`;
      downloadQRCode(eq.qr_code_image!, filename);
    });

    toast.success(`Downloaded ${selectedEquipmentWithQR.length} QR codes`);
  };

  const printLabels = () => {
    const selectedEquipmentWithQR = equipment.filter(
      (eq) => selectedIds.has(eq.id) && eq.qr_code_image
    );

    if (selectedEquipmentWithQR.length === 0) {
      toast.error('No QR codes available to print');
      return;
    }

    setShowPrintPreview(true);

    // Wait for render then print
    setTimeout(() => {
      window.print();
    }, 500);
  };

  const filteredEquipment = equipment.filter((eq) => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return (
      eq.name.toLowerCase().includes(searchLower) ||
      eq.equipment_type?.toLowerCase().includes(searchLower) ||
      eq.make?.toLowerCase().includes(searchLower) ||
      eq.model?.toLowerCase().includes(searchLower) ||
      eq.serial_number?.toLowerCase().includes(searchLower)
    );
  });

  const selectedEquipmentWithQR = equipment.filter(
    (eq) => selectedIds.has(eq.id) && eq.qr_code_image
  );

  if (showPrintPreview) {
    return (
      <div className="print-container">
        <style>{`
          @media print {
            body * {
              visibility: hidden;
            }
            .print-container, .print-container * {
              visibility: visible;
            }
            .print-container {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
            }
            .qr-label {
              page-break-inside: avoid;
              break-inside: avoid;
            }
            .no-print {
              display: none !important;
            }
          }
        `}</style>

        <div className="p-4 space-y-4 no-print">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Print Preview</h2>
            <div className="flex gap-2">
              <Button onClick={() => window.print()} variant="default">
                <Printer className="mr-2 h-4 w-4" />
                Print
              </Button>
              <Button onClick={() => setShowPrintPreview(false)} variant="outline">
                Close Preview
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 p-4">
          {selectedEquipmentWithQR.map((eq) => (
            <div
              key={eq.id}
              className="qr-label border-2 border-gray-300 rounded-lg p-4 text-center bg-white"
            >
              <img
                src={eq.qr_code_image}
                alt={`QR Code for ${eq.name}`}
                className="w-full h-auto mx-auto mb-2"
              />
              <h3 className="font-bold text-sm mb-1">{eq.name}</h3>
              <p className="text-xs text-gray-600">
                {eq.make} {eq.model}
              </p>
              {eq.serial_number && (
                <p className="text-xs text-gray-500 font-mono mt-1">{eq.serial_number}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-6 w-6" />
            Equipment QR Code Labels
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Generate, download, and print QR code labels for your equipment
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Actions Bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search equipment..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Button onClick={loadEquipment} variant="outline" disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {/* Selection Actions */}
          {selectedIds.size > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between flex-wrap gap-2">
                <span>{selectedIds.size} equipment selected</span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={generateBatchQR}
                    disabled={isGenerating}
                    className="bg-construction-orange"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating {generationProgress.current}/{generationProgress.total}
                      </>
                    ) : (
                      <>
                        <QrCode className="mr-2 h-4 w-4" />
                        Generate QR Codes
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    onClick={downloadBatchQR}
                    variant="outline"
                    disabled={selectedEquipmentWithQR.length === 0}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download ({selectedEquipmentWithQR.length})
                  </Button>
                  <Button
                    size="sm"
                    onClick={printLabels}
                    variant="outline"
                    disabled={selectedEquipmentWithQR.length === 0}
                  >
                    <Printer className="mr-2 h-4 w-4" />
                    Print Labels ({selectedEquipmentWithQR.length})
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Equipment List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between py-2 border-b">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleSelectAll}
                className="gap-2"
              >
                {selectedIds.size === filteredEquipment.length ? (
                  <CheckSquare className="h-4 w-4" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
                Select All ({filteredEquipment.length})
              </Button>
              <span className="text-sm text-muted-foreground">
                {equipment.filter((eq) => eq.qr_code_id).length} / {equipment.length} have QR
                codes
              </span>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : filteredEquipment.length === 0 ? (
              <div className="text-center py-12">
                <Wrench className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-medium mb-2">No Equipment Found</h3>
                <p className="text-sm text-muted-foreground">
                  {searchQuery ? 'Try adjusting your search' : 'Add equipment to get started'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredEquipment.map((eq) => (
                  <Card key={eq.id} className="hover:bg-muted/50 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <Checkbox
                          checked={selectedIds.has(eq.id)}
                          onCheckedChange={() => toggleSelection(eq.id)}
                          className="mt-1"
                        />

                        {eq.qr_code_image && (
                          <img
                            src={eq.qr_code_image}
                            alt={`QR for ${eq.name}`}
                            className="w-20 h-20 border rounded"
                          />
                        )}

                        <div className="flex-1">
                          <h3 className="font-medium">{eq.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {eq.make} {eq.model}
                          </p>
                          {eq.serial_number && (
                            <p className="text-xs text-muted-foreground font-mono mt-1">
                              S/N: {eq.serial_number}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="secondary">{eq.equipment_type || 'Equipment'}</Badge>
                            {eq.qr_code_id && (
                              <Badge variant="outline" className="bg-green-50">
                                QR Generated
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col gap-2">
                          <Button
                            size="sm"
                            onClick={() => generateSingleQR(eq)}
                            disabled={isGenerating}
                            variant={eq.qr_code_id ? 'outline' : 'default'}
                          >
                            {isGenerating ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <QrCode className="h-4 w-4 mr-2" />
                            )}
                            {eq.qr_code_id ? 'Regenerate' : 'Generate'}
                          </Button>

                          {eq.qr_code_image && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => downloadSingleQR(eq)}
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EquipmentQRLabelManager;

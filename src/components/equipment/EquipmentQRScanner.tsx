/**
 * Equipment QR Scanner Component
 * Real-time QR code scanning for equipment check-in/out with camera integration
 */

import React, { useState, useRef, useEffect } from 'react';
import QrScanner from 'qr-scanner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  QrCode,
  Wrench,
  Search,
  X,
  CheckCircle,
  Camera,
  MapPin,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useEquipmentQRScanning,
  type EquipmentWithQR,
  type ProcessScanResult,
} from '@/hooks/useEquipmentQRScanning';
import {
  toEquipmentScanType,
  validateScannedQRValue,
  type EquipmentScanType,
  type LegacyScanType,
} from '@/services/qrCodeService';
import { useAuth } from '@/contexts/AuthContext';

interface EquipmentQRScannerProps {
  onScanComplete: (result: ScanResult) => void;
  onCancel: () => void;
  scanType: EquipmentScanType | LegacyScanType;
  title?: string;
  projectId?: string;
  /**
   * When true (the default), confirming logs the scan through
   * process_equipment_qr_scan. Pass false when the parent only needs the
   * scanner to identify the equipment and records the scan itself.
   */
  recordScan?: boolean;
}

export interface ScanResult {
  success: boolean;
  /** The raw scanned string, as the RPC needs it. */
  qrCodeValue: string;
  equipment: EquipmentWithQR | null;
  scanType: EquipmentScanType;
  /** The RPC's answer, when recordScan was on. */
  scan?: ProcessScanResult;
}

export const EquipmentQRScanner: React.FC<EquipmentQRScannerProps> = ({
  onScanComplete,
  onCancel,
  scanType: requestedScanType,
  title,
  projectId,
  recordScan = true,
}) => {
  const scanType = toEquipmentScanType(requestedScanType);
  const { userProfile } = useAuth();
  const { equipmentWithQR, loadingEquipment, processScanAsync, processingScans } =
    useEquipmentQRScanning();

  const [isScanning, setIsScanning] = useState(false);
  const [scannedQRValue, setScannedQRValue] = useState<string>('');
  const [manualQRValue, setManualQRValue] = useState<string>('');
  const [equipment, setEquipment] = useState<EquipmentWithQR | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [useGPS, setUseGPS] = useState(true);
  const [gpsLocation, setGpsLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const qrScannerRef = useRef<QrScanner | null>(null);

  // Get GPS location on mount
  useEffect(() => {
    if (useGPS && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGpsLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.error('Error getting GPS location:', error);
          toast.error('Could not get GPS location. Proceeding without it.');
          setUseGPS(false);
        }
      );
    }
  }, [useGPS]);

  const getScanTypeLabel = () => {
    switch (scanType) {
      case 'check_out':
        return 'Check Out Equipment';
      case 'check_in':
        return 'Check In Equipment';
      case 'inspection':
        return 'Inspect Equipment';
      case 'maintenance':
        return 'Log Maintenance';
      case 'location_update':
        return 'Update Location';
      case 'verification':
        return 'Verify Equipment';
      default:
        return 'Scan Equipment';
    }
  };

  const startScanning = async () => {
    try {
      if (!videoRef.current) {
        throw new Error('Video element not ready');
      }

      // Initialize QR Scanner
      qrScannerRef.current = new QrScanner(
        videoRef.current,
        (result) => onDetectedRef.current(result.data),
        {
          returnDetailedScanResult: true,
          highlightScanRegion: true,
          highlightCodeOutline: true,
          preferredCamera: 'environment',
        }
      );

      await qrScannerRef.current.start();
      setIsScanning(true);
      toast.success('Camera started. Position QR code in view.');
    } catch (error) {
      console.error('Error starting camera:', error);
      toast.error('Could not access camera. Please check permissions.');
    }
  };

  const stopScanning = () => {
    if (qrScannerRef.current) {
      qrScannerRef.current.stop();
      qrScannerRef.current.destroy();
      qrScannerRef.current = null;
    }
    setIsScanning(false);
  };

  const handleQRDetected = (qrValue: string) => {
    setScannedQRValue(qrValue);
    stopScanning();
    validateAndLookupEquipment(qrValue);
  };

  // QrScanner keeps the callback it was built with. Route it through a ref so
  // a detection sees the equipment list as it is now, not as it was when the
  // camera started (often still empty).
  const onDetectedRef = useRef(handleQRDetected);
  onDetectedRef.current = handleQRDetected;

  const fail = (message: string) => {
    setValidationError(message);
    toast.error(message);
  };

  const validateAndLookupEquipment = (qrValue: string) => {
    setValidationError(null);
    setEquipment(null);

    const validation = validateScannedQRValue(qrValue, userProfile?.company_id);
    if (!validation.valid) {
      fail(validation.error);
      return;
    }

    if (loadingEquipment) {
      fail('Equipment list is still loading. Try again in a moment.');
      return;
    }

    const foundEquipment = equipmentWithQR.find(
      (eq) => eq.equipment_id === validation.data.equipmentId
    );

    if (!foundEquipment) {
      fail('Equipment not found');
      return;
    }

    // The RPC matches the label byte for byte against the active code. Labels
    // printed before the image was rendered from qr_code_value carry a
    // different string and will never match; say so instead of failing later.
    if (foundEquipment.qr_code_value !== qrValue) {
      fail(`This label for ${foundEquipment.name} is out of date. Reprint it from the QR labels page.`);
      return;
    }

    setEquipment(foundEquipment);
    toast.success(`Equipment found: ${foundEquipment.name}`);
  };

  const handleManualLookup = () => {
    if (!manualQRValue.trim()) {
      toast.error('Please enter a QR code value');
      return;
    }

    setScannedQRValue(manualQRValue);
    validateAndLookupEquipment(manualQRValue);
  };

  const handleConfirm = async () => {
    if (!equipment || validationError) return;

    if (!recordScan) {
      onScanComplete({ success: true, qrCodeValue: scannedQRValue, equipment, scanType });
      return;
    }

    try {
      // The hook toasts both outcomes.
      const scan = await processScanAsync({
        qrCodeValue: scannedQRValue,
        scanType,
        projectId,
        latitude: gpsLocation?.latitude,
        longitude: gpsLocation?.longitude,
      });

      if (!scan.success) {
        setValidationError(scan.error || 'Failed to process scan');
        return;
      }

      onScanComplete({ success: true, qrCodeValue: scannedQRValue, equipment, scanType, scan });
    } catch (error) {
      setValidationError(error instanceof Error ? error.message : 'Failed to process scan');
    }
  };

  useEffect(() => {
    return () => stopScanning();
  }, []);

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="h-5 w-5" />
          {title || getScanTypeLabel()}
        </CardTitle>
        <p className="text-muted-foreground">
          Scan equipment QR code to {scanType.replace('_', ' ')}
        </p>
        {useGPS && gpsLocation && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            GPS enabled
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Scanner Section */}
        <div>
          {!isScanning && !scannedQRValue ? (
            <div className="space-y-4">
              <Button
                onClick={startScanning}
                className="w-full h-32 border-dashed border-2"
                variant="outline"
              >
                <div className="text-center">
                  <Camera className="h-8 w-8 mx-auto mb-2" />
                  <p className="font-medium">Start Camera Scanner</p>
                  <p className="text-sm text-muted-foreground">
                    Position equipment QR code in view
                  </p>
                </div>
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or enter manually
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="Enter QR code value or scan barcode"
                  value={manualQRValue}
                  onChange={(e) => setManualQRValue(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleManualLookup()}
                />
                <Button onClick={handleManualLookup} aria-label="Look up QR code">
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : null}

          {/* The video stays mounted: startScanning needs videoRef before
              isScanning flips, so rendering it only while scanning meant the
              camera could never start. */}
          <div className={isScanning ? 'relative' : 'hidden'}>
            <video
              ref={videoRef}
              className="w-full h-80 object-cover rounded-lg bg-black"
              playsInline
              muted
            />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-64 h-64 border-4 border-primary rounded-lg shadow-lg">
                <div className="w-full h-full border-2 border-primary/50 rounded-lg animate-pulse" />
              </div>
            </div>
            <Button
              onClick={stopScanning}
              className="absolute top-4 right-4 z-10"
              size="sm"
              variant="secondary"
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white text-sm bg-black/70 px-4 py-2 rounded-lg">
              <QrCode className="h-4 w-4 inline mr-2 animate-pulse" />
              Scanning for QR codes...
            </div>
          </div>
        </div>

        {/* Results Section */}
        {scannedQRValue && (
          <div className="space-y-4">
            <div className="bg-muted/50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="font-medium">QR Code Scanned</span>
              </div>
              <div className="font-mono text-xs break-all bg-background p-2 rounded">
                {scannedQRValue.substring(0, 100)}
                {scannedQRValue.length > 100 && '...'}
              </div>
            </div>

            {validationError ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{validationError}</AlertDescription>
              </Alert>
            ) : equipment ? (
              <Card className="border-2 border-primary">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Wrench className="h-5 w-5" />
                        {equipment.name}
                      </CardTitle>
                      <Badge variant="secondary" className="mt-2">
                        {equipment.equipment_type || 'Equipment'}
                      </Badge>
                    </div>
                    {equipment.qr_code_id && (
                      <Badge variant="outline" className="bg-green-50">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Verified
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {equipment.model && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Model</Label>
                        <p className="font-medium">{equipment.model}</p>
                      </div>
                    )}

                    {equipment.serial_number && (
                      <div className="col-span-2">
                        <Label className="text-xs text-muted-foreground">Serial Number</Label>
                        <p className="font-mono text-sm">{equipment.serial_number}</p>
                      </div>
                    )}

                    <div>
                      <Label className="text-xs text-muted-foreground">Status</Label>
                      <p className="font-medium capitalize">
                        {equipment.status?.replace('_', ' ') || 'Unknown'}
                      </p>
                    </div>

                    {equipment.location && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Location</Label>
                        <p className="font-medium">{equipment.location}</p>
                      </div>
                    )}

                    {!!equipment.scan_count && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Total Scans</Label>
                        <p className="font-medium">{equipment.scan_count}</p>
                      </div>
                    )}
                  </div>

                  {projectId && (
                    <Alert>
                      <MapPin className="h-4 w-4" />
                      <AlertDescription className="text-sm">
                        Will be logged for current project
                        {gpsLocation && ' with GPS coordinates'}
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Equipment not found in database</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button onClick={onCancel} variant="outline" className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setScannedQRValue('');
                  setEquipment(null);
                  setValidationError(null);
                  setManualQRValue('');
                }}
                variant="outline"
                className="flex-1"
              >
                Scan Another
              </Button>
              <Button
                onClick={handleConfirm}
                className="flex-1 bg-construction-orange"
                disabled={!equipment || !!validationError || processingScans}
              >
                {processingScans ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                {scanType === 'check_out' && 'Check Out'}
                {scanType === 'check_in' && 'Check In'}
                {scanType === 'inspection' && 'Inspect'}
                {scanType === 'maintenance' && 'Log Maintenance'}
                {scanType === 'location_update' && 'Update Location'}
                {scanType === 'verification' && 'Verify'}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EquipmentQRScanner;

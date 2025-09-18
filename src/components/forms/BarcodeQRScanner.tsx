import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { QrCode, Package, Search, X, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface BarcodeQRScannerProps {
  onScanResult: (result: ScanResult) => void;
  onCancel: () => void;
  title?: string;
  scanType?: 'equipment' | 'materials' | 'both';
}

interface ScanResult {
  code: string;
  type: 'barcode' | 'qr';
  itemData?: ItemData;
}

interface ItemData {
  name: string;
  category: string;
  model?: string;
  manufacturer?: string;
  price?: number;
  description?: string;
  lastMaintenance?: Date;
  nextMaintenance?: Date;
  serialNumber?: string;
}

export const BarcodeQRScanner: React.FC<BarcodeQRScannerProps> = ({
  onScanResult,
  onCancel,
  title = "Scan Equipment & Materials",
  scanType = 'both'
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [scannedCode, setScannedCode] = useState<string>('');
  const [manualCode, setManualCode] = useState<string>('');
  const [itemData, setItemData] = useState<ItemData | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Mock database for equipment and materials
  const mockDatabase: Record<string, ItemData> = {
    '123456789': {
      name: 'DeWalt 20V Max Drill',
      category: 'Power Tools',
      model: 'DCD771C2',
      manufacturer: 'DeWalt',
      price: 149.99,
      description: '20V MAX Cordless Drill/Driver Kit',
      lastMaintenance: new Date('2024-01-15'),
      nextMaintenance: new Date('2024-07-15'),
      serialNumber: 'DW123456'
    },
    '987654321': {
      name: 'Concrete Mix 80lb',
      category: 'Building Materials',
      manufacturer: 'Quikrete',
      price: 4.98,
      description: '80 lb. Concrete Mix for general construction'
    },
    'QR-TOOL-001': {
      name: 'Site Safety Equipment Kit',
      category: 'Safety',
      description: 'Complete safety equipment for construction site',
      lastMaintenance: new Date('2024-02-01')
    }
  };

  const startScanning = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsScanning(true);
        videoRef.current.play();
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast.error('Could not access camera. Please check permissions.');
    }
  };

  const stopScanning = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  };

  const lookupItem = async (code: string) => {
    setIsLookingUp(true);
    
    try {
      // Simulate API lookup
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const item = mockDatabase[code];
      if (item) {
        setItemData(item);
        toast.success('Item found in database');
      } else {
        toast.error('Item not found in database');
        setItemData(null);
      }
    } catch (error) {
      console.error('Error looking up item:', error);
      toast.error('Failed to lookup item');
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleCodeDetected = async (code: string) => {
    setScannedCode(code);
    stopScanning();
    await lookupItem(code);
  };

  const handleManualLookup = async () => {
    if (!manualCode.trim()) {
      toast.error('Please enter a code');
      return;
    }
    
    setScannedCode(manualCode);
    await lookupItem(manualCode);
  };

  const handleConfirm = () => {
    const result: ScanResult = {
      code: scannedCode,
      type: scannedCode.startsWith('QR-') ? 'qr' : 'barcode',
      itemData: itemData || undefined
    };
    onScanResult(result);
  };

  // Simulate barcode detection (in real implementation, use a library like QuaggaJS)
  useEffect(() => {
    if (isScanning) {
      const interval = setInterval(() => {
        // Simulate random barcode detection
        if (Math.random() > 0.95) {
          const codes = Object.keys(mockDatabase);
          const randomCode = codes[Math.floor(Math.random() * codes.length)];
          handleCodeDetected(randomCode);
        }
      }, 500);

      return () => clearInterval(interval);
    }
  }, [isScanning]);

  useEffect(() => {
    return () => stopScanning();
  }, []);

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="h-5 w-5" />
          {title}
        </CardTitle>
        <p className="text-muted-foreground">
          Scan barcodes or QR codes to quickly add equipment and materials
        </p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Scanner Section */}
        <div>
          {!isScanning && !scannedCode ? (
            <div className="space-y-4">
              <Button
                onClick={startScanning}
                className="w-full h-32 border-dashed border-2"
                variant="outline"
              >
                <div className="text-center">
                  <QrCode className="h-8 w-8 mx-auto mb-2" />
                  <p className="font-medium">Start Camera Scanner</p>
                  <p className="text-sm text-muted-foreground">
                    Position barcode or QR code in view
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
                  placeholder="Enter barcode/QR code"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleManualLookup()}
                />
                <Button 
                  onClick={handleManualLookup}
                  disabled={isLookingUp}
                >
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : isScanning ? (
            <div className="relative">
              <video
                ref={videoRef}
                className="w-full h-64 object-cover rounded-lg bg-black"
                playsInline
                muted
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-48 h-32 border-2 border-primary rounded-lg">
                  <div className="w-full h-full border border-primary/50 rounded animate-pulse" />
                </div>
              </div>
              <Button
                onClick={stopScanning}
                className="absolute top-4 right-4"
                size="sm"
                variant="secondary"
              >
                <X className="h-4 w-4" />
              </Button>
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white text-sm bg-black/50 px-3 py-1 rounded">
                Scanning for codes...
              </div>
            </div>
          ) : null}
        </div>

        {/* Results Section */}
        {scannedCode && (
          <div className="space-y-4">
            <div className="bg-muted/50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="font-medium">Code Detected</span>
              </div>
              <div className="font-mono text-lg">{scannedCode}</div>
            </div>

            {isLookingUp ? (
              <div className="bg-muted/50 p-4 rounded-lg">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 animate-pulse" />
                  <span>Looking up item in database...</span>
                </div>
              </div>
            ) : itemData ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{itemData.name}</CardTitle>
                  <Badge variant="secondary">{itemData.category}</Badge>
                </CardHeader>
                <CardContent className="space-y-2">
                  {itemData.manufacturer && (
                    <div>
                      <Label>Manufacturer</Label>
                      <p className="text-sm">{itemData.manufacturer}</p>
                    </div>
                  )}
                  
                  {itemData.model && (
                    <div>
                      <Label>Model</Label>
                      <p className="text-sm">{itemData.model}</p>
                    </div>
                  )}
                  
                  {itemData.serialNumber && (
                    <div>
                      <Label>Serial Number</Label>
                      <p className="text-sm font-mono">{itemData.serialNumber}</p>
                    </div>
                  )}
                  
                  {itemData.description && (
                    <div>
                      <Label>Description</Label>
                      <p className="text-sm">{itemData.description}</p>
                    </div>
                  )}
                  
                  {itemData.price && (
                    <div>
                      <Label>Price</Label>
                      <p className="text-sm">${itemData.price.toFixed(2)}</p>
                    </div>
                  )}
                  
                  {itemData.nextMaintenance && (
                    <div>
                      <Label>Next Maintenance</Label>
                      <p className="text-sm">{itemData.nextMaintenance.toLocaleDateString()}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                <p className="text-sm text-yellow-800">
                  Item not found in database. You can still proceed with the scanned code.
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={onCancel} variant="outline" className="flex-1">
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  setScannedCode('');
                  setItemData(null);
                }}
                variant="outline" 
                className="flex-1"
              >
                Scan Another
              </Button>
              <Button onClick={handleConfirm} className="flex-1">
                <CheckCircle className="h-4 w-4 mr-2" />
                Use This Item
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
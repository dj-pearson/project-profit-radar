import React, { useEffect, useRef } from 'react';
import SignaturePad from 'signature_pad';
import { Button } from '@/components/ui/button';

interface SignatureCaptureProps {
  onChange?: (dataUrl: string | null) => void;
  height?: number;
}

const SignatureCapture: React.FC<SignatureCaptureProps> = ({ onChange, height = 200 }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const padRef = useRef<SignaturePad | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.offsetWidth * dpr;
    canvas.height = height * dpr;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.scale(dpr, dpr);

    padRef.current = new SignaturePad(canvas, {
      backgroundColor: 'rgba(255,255,255,0)',
      penColor: '#111827'
    });

    const handleEnd = () => {
      const data = padRef.current?.isEmpty() ? null : padRef.current?.toDataURL('image/png') || null;
      onChange?.(data);
    };

    padRef.current.addEventListener('endStroke', handleEnd);

    return () => {
      padRef.current?.off();
      padRef.current?.clear();
      padRef.current = null;
    };
  }, [height, onChange]);

  const clear = () => {
    padRef.current?.clear();
    onChange?.(null);
  };

  return (
    <div className="space-y-2">
      <div className="border rounded-md bg-background">
        <canvas ref={canvasRef} style={{ width: '100%', height }} />
      </div>
      <div className="flex justify-end">
        <Button type="button" variant="outline" onClick={clear}>Clear</Button>
      </div>
    </div>
  );
};

export default SignatureCapture;

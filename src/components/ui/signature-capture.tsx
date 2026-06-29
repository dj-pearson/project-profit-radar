import { useRef, useEffect, useState } from 'react';
import { Eraser } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SignatureCaptureProps {
  /** Existing signature (base64 PNG data URL) to prefill. */
  value?: string | null;
  /** Called with the base64 PNG data URL when drawn, or null when cleared. */
  onChange: (dataUrl: string | null) => void;
  width?: number;
  height?: number;
  label?: string;
}

/**
 * US-108: Reusable signature pad.
 *
 * Draws on a canvas with mouse (desktop) or touch (mobile), exposes a Clear
 * button, and emits the signature as a base64 PNG data URL via onChange.
 */
export function SignatureCapture({
  value,
  onChange,
  width = 500,
  height = 180,
  label = 'Signature',
}: SignatureCaptureProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const [hasInk, setHasInk] = useState(!!value);

  // Configure the canvas and (re)draw the prefilled signature whenever `value`
  // changes, keeping `hasInk` in sync so Clear reflects a provided signature.
  useEffect(() => {
    // Keep `hasInk` in sync with the provided value first — independent of canvas
    // availability — so Clear reflects a prefilled signature even where a 2D
    // context isn't available (e.g. jsdom in tests).
    setHasInk(!!value);

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#111827';
    // Always clear first so switching signatures doesn't stack, and an external
    // reset (value -> null) removes stale ink.
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (value) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      img.src = value;
    }
  }, [value]);

  const point = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const isTouch = 'touches' in e;
    const clientX = isTouch ? e.touches[0].clientX : e.clientX;
    const clientY = isTouch ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    drawing.current = true;
    const p = point(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing.current) return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const p = point(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  };

  const endDraw = () => {
    if (!drawing.current) return;
    drawing.current = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    setHasInk(true);
    onChange(canvas.toDataURL('image/png'));
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasInk(false);
    onChange(null);
  };

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <Button type="button" variant="ghost" size="sm" onClick={clear} disabled={!hasInk}>
          <Eraser className="mr-1 h-3.5 w-3.5" /> Clear
        </Button>
      </div>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="w-full touch-none rounded-md border bg-white"
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={endDraw}
        onMouseLeave={endDraw}
        onTouchStart={startDraw}
        onTouchMove={draw}
        onTouchEnd={endDraw}
        role="img"
        aria-label={`${label} drawing area`}
      />
    </div>
  );
}

export default SignatureCapture;

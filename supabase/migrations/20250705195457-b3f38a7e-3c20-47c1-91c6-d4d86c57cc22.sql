-- Add OCR and AI classification fields to documents table
ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS ocr_text TEXT,
ADD COLUMN IF NOT EXISTS ai_classification JSONB,
ADD COLUMN IF NOT EXISTS auto_routed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS routing_confidence TEXT DEFAULT 'pending';

-- Add comment for clarity
COMMENT ON COLUMN public.documents.ocr_text IS 'Extracted text from OCR processing';
COMMENT ON COLUMN public.documents.ai_classification IS 'AI analysis results including document type, vendor, amount, suggested routing';
COMMENT ON COLUMN public.documents.auto_routed IS 'Whether document was automatically routed based on AI analysis';
COMMENT ON COLUMN public.documents.routing_confidence IS 'AI confidence level: high, medium, low, pending';
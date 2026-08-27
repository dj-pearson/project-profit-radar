/**
 * Image Processor Edge Function
 * Converts uploaded images to WebP/AVIF format for optimal delivery
 *
 * Features:
 * - Automatic WebP/AVIF conversion on upload
 * - Multiple resolution generation
 * - Thumbnail creation
 * - Compression optimization
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';
import { getCorsHeaders } from '../_shared/secure-cors.ts';

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[IMAGE-PROCESSOR] ${step}${detailsStr}`);
};

// Image processing configuration
const CONFIG = {
  // Supported input formats
  supportedInputFormats: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],

  // Output formats to generate
  outputFormats: ['webp', 'avif'] as const,

  // Quality settings per format (0-100)
  quality: {
    webp: 85,
    avif: 80,
    jpeg: 85,
    png: 90,
    thumbnail: 70,
  },

  // Sizes to generate (width in pixels)
  sizes: [
    { name: 'thumbnail', width: 200, height: 200 },
    { name: 'small', width: 640, height: null },
    { name: 'medium', width: 1024, height: null },
    { name: 'large', width: 1920, height: null },
    { name: 'original', width: null, height: null },
  ],

  // Maximum file size for processing (50MB)
  maxFileSize: 50 * 1024 * 1024,

  // Maximum dimensions
  maxWidth: 8192,
  maxHeight: 8192,
};

interface ProcessingRequest {
  // Storage path to the image
  storagePath: string;
  // Storage bucket name
  bucket: string;
  // Whether to generate thumbnails
  generateThumbnail?: boolean;
  // Whether to generate responsive sizes
  generateResponsiveSizes?: boolean;
  // Whether to convert to modern formats
  convertToModernFormats?: boolean;
  // Custom quality override
  quality?: number;
  // Company ID
  companyId?: string;
  // Document ID to update
  documentId?: string;
}

interface ProcessingResult {
  success: boolean;
  original: {
    path: string;
    size: number;
    format: string;
    width?: number;
    height?: number;
  };
  processed: {
    format: string;
    size: string;
    path: string;
    width?: number;
    height?: number;
  }[];
  thumbnail?: string;
  /** How many versions were queued for real processing. Additive (US-300). */
  versionsQueued?: number;
  savings?: {
    originalSize: number;
    processedSize: number;
    percentage: number;
    /**
     * Present while nothing has actually been compressed. Additive, and kept in
     * step with ProcessingResult in src/hooks/useImageProcessor.ts (US-300).
     */
    note?: string;
  };
  error?: string;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json() as ProcessingRequest;
    const {
      storagePath,
      bucket,
      generateThumbnail = true,
      generateResponsiveSizes = true,
      convertToModernFormats = true,
      quality,
      companyId,
      documentId,
    } = body;

    if (!storagePath || !bucket) {
      return new Response(JSON.stringify({ error: 'Missing required parameters' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    logStep('Processing image', { storagePath, bucket });

    // Download the original image
    const { data: imageData, error: downloadError } = await supabase.storage
      .from(bucket)
      .download(storagePath);

    if (downloadError || !imageData) {
      logStep('Download failed', { error: downloadError?.message });
      return new Response(JSON.stringify({ error: 'Failed to download image' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get image metadata
    const contentType = imageData.type;
    const originalSize = imageData.size;

    logStep('Image downloaded', { contentType, size: originalSize });

    // Validate format
    if (!CONFIG.supportedInputFormats.includes(contentType)) {
      return new Response(JSON.stringify({
        error: `Unsupported format: ${contentType}. Supported: ${CONFIG.supportedInputFormats.join(', ')}`
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate size
    if (originalSize > CONFIG.maxFileSize) {
      return new Response(JSON.stringify({
        error: `File too large: ${formatFileSize(originalSize)}. Max: ${formatFileSize(CONFIG.maxFileSize)}`
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Process the image
    const result = await processImage(
      supabase,
      imageData,
      storagePath,
      bucket,
      {
        generateThumbnail,
        generateResponsiveSizes,
        convertToModernFormats,
        quality: quality || CONFIG.quality.webp,
        companyId,
      }
    );

    // Update document record if provided.
    //
    // Two things were wrong here. The error was discarded, and supabase-js
    // returns it rather than throwing, so the document could keep its old
    // thumbnail while the response reported a new one. And the status written
    // was 'completed', which is not true: nothing in this function resizes or
    // transcodes anything. See processImage below - the "responsive sizes" are
    // the original blob re-uploaded under a .webp name, and the real work is
    // handed to image_processing_queue. 'pending' is what that queue row means
    // (US-300).
    if (documentId && result.success) {
      const { error: documentError } = await supabase
        .from('documents')
        .update({
          thumbnail_url: result.thumbnail,
          transcoded_versions: JSON.stringify(result.processed),
          transcoding_status: 'pending',
          updated_at: new Date().toISOString(),
        })
        .eq('id', documentId);

      if (documentError) {
        throw new Error(
          `Document ${documentId} was processed but its record was NOT updated, so it still points at the old versions: ${documentError.message}`,
        );
      }
    }

    logStep('Processing complete', {
      success: result.success,
      processedCount: result.processed.length,
      savings: result.savings?.percentage,
    });

    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep('ERROR', { message: errorMessage });

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function processImage(
  supabase: ReturnType<typeof createClient>,
  imageBlob: Blob,
  originalPath: string,
  bucket: string,
  options: {
    generateThumbnail: boolean;
    generateResponsiveSizes: boolean;
    convertToModernFormats: boolean;
    quality: number;
    companyId?: string;
  }
): Promise<ProcessingResult> {
  const processed: ProcessingResult['processed'] = [];
  let thumbnailUrl: string | undefined;
  let totalProcessedSize = 0;

  const baseName = originalPath.replace(/\.[^.]+$/, '');
  const originalFormat = originalPath.split('.').pop()?.toLowerCase() || 'unknown';

  try {
    // Get image dimensions (simplified - in production use sharp or similar)
    const imageBuffer = await imageBlob.arrayBuffer();

    // For now, since we can't use sharp in Deno Deploy, we'll create optimized versions
    // by re-uploading with different paths. In production, use a dedicated image
    // processing service or a library like imagemagick via WASM.

    // Store metadata about what needs to be processed
    const processingManifest = {
      original: {
        path: originalPath,
        size: imageBlob.size,
        format: originalFormat,
      },
      requestedVersions: [] as { format: string; size: string; path: string }[],
    };

    // Generate WebP path
    if (options.convertToModernFormats) {
      const webpPath = `${baseName}.webp`;
      processingManifest.requestedVersions.push({
        format: 'webp',
        size: 'original',
        path: webpPath,
      });

      // Upload WebP version (in production, actually convert)
      // For now, we store the same image with different extension as a placeholder
      await supabase.storage
        .from(bucket)
        .upload(webpPath, imageBlob, {
          contentType: 'image/webp',
          upsert: true,
        });

      const { data: { publicUrl: webpUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(webpPath);

      processed.push({
        format: 'webp',
        size: 'original',
        path: webpUrl,
      });
    }

    // Generate thumbnail
    if (options.generateThumbnail) {
      const thumbPath = `${baseName}-thumb.webp`;
      processingManifest.requestedVersions.push({
        format: 'webp',
        size: 'thumbnail',
        path: thumbPath,
      });

      // Upload thumbnail (placeholder - in production, resize)
      await supabase.storage
        .from(bucket)
        .upload(thumbPath, imageBlob, {
          contentType: 'image/webp',
          upsert: true,
        });

      const { data: { publicUrl: thumbUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(thumbPath);

      thumbnailUrl = thumbUrl;
      processed.push({
        format: 'webp',
        size: 'thumbnail',
        path: thumbUrl,
        width: 200,
        height: 200,
      });
    }

    // Generate responsive sizes
    if (options.generateResponsiveSizes) {
      for (const sizeConfig of CONFIG.sizes.filter(s => s.name !== 'original' && s.name !== 'thumbnail')) {
        const sizePath = `${baseName}-${sizeConfig.name}.webp`;
        processingManifest.requestedVersions.push({
          format: 'webp',
          size: sizeConfig.name,
          path: sizePath,
        });

        await supabase.storage
          .from(bucket)
          .upload(sizePath, imageBlob, {
            contentType: 'image/webp',
            upsert: true,
          });

        const { data: { publicUrl: sizeUrl } } = supabase.storage
          .from(bucket)
          .getPublicUrl(sizePath);

        processed.push({
          format: 'webp',
          size: sizeConfig.name,
          path: sizeUrl,
          width: sizeConfig.width || undefined,
        });

        totalProcessedSize += imageBlob.size; // Placeholder
      }
    }

    // Store processing manifest for later actual processing
    // (In production, trigger async processing job).
    //
    // The `.then(() => {}).catch(() => {})` here discarded the result outright.
    // The catch was dead code either way - postgrest resolves with { error }
    // rather than rejecting - and the comment justifying it ("Queue table might
    // not exist") is wrong: image_processing_queue is created by migration
    // 20251209000004. This row is the ONLY handoff to the job that does the
    // real resizing, so losing it means the versions are never produced
    // (US-300).
    const { error: queueError } = await supabase
      .from('image_processing_queue')
      .upsert({
        company_id: options.companyId,
        original_path: originalPath,
        bucket,
        processing_manifest: processingManifest,
        status: 'pending',
        created_at: new Date().toISOString(),
      }, {
        onConflict: 'original_path,bucket',
      });

    if (queueError) {
      throw new Error(
        `Processing manifest for ${originalPath} was not queued, so no version of this image will ever be produced: ${queueError.message}`,
      );
    }

    // `savings` used to be `imageBlob.size * 0.65` with the comment "~35%
    // savings typical" - a constant dressed up as a measurement, reported to
    // the caller as if this function had compressed anything. It has not: every
    // "version" above is the original blob re-uploaded under a different name.
    // Report the real numbers and say the versions are queued (US-300).
    return {
      success: true,
      original: {
        path: originalPath,
        size: imageBlob.size,
        format: originalFormat,
      },
      processed,
      thumbnail: thumbnailUrl,
      versionsQueued: processingManifest.requestedVersions.length,
      savings: {
        originalSize: imageBlob.size,
        processedSize: imageBlob.size,
        percentage: 0,
        note: 'No compression has happened yet. The requested versions are queued in image_processing_queue.',
      },
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep('Processing failed', { error: errorMessage });

    return {
      success: false,
      original: {
        path: originalPath,
        size: imageBlob.size,
        format: originalFormat,
      },
      processed,
      error: errorMessage,
    };
  }
}

function formatFileSize(bytes: number): string {
  const sizes = ['B', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 B';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
}

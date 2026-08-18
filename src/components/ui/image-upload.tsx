import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, X, Image as ImageIcon, ExternalLink } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { compressImage } from '@/lib/image-compression';
import { isAbsoluteUrl, parseStorageUrl } from '@/lib/storage/signedUrl';
import { useStorageUrl } from '@/lib/storage/useStorageUrl';

interface ImageUploadProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  bucket: string;
  path?: string;
  accept?: string;
  maxSizeMB?: number;
}

export const ImageUpload = ({
  value,
  onChange,
  label = "Image",
  placeholder = "Upload an image or enter a URL",
  bucket,
  path = "",
  accept = "image/*",
  maxSizeMB = 5
}: ImageUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [mode, setMode] = useState<'upload' | 'url'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: `File size must be less than ${maxSizeMB}MB`
      });
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        variant: "destructive",
        title: "Invalid file type",
        description: "Please select an image file"
      });
      return;
    }

    try {
      setUploading(true);

      // Compress raster images before upload so field users on cellular
      // don't burn their data plan. SVG/GIF and already-small files pass
      // through untouched.
      const uploadFile = await compressImage(file);

      // Use the compressed file's extension (may have become .jpg) so the
      // filename and MIME on Storage stay consistent.
      const fileExt = uploadFile.name.split('.').pop() || file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = path ? `${path}/${fileName}` : fileName;

      // Upload file to Supabase Storage
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, uploadFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      // Persist the storage path, not a permanent public URL (US-289).
      // The preview below resolves it through resolveStorageUrl, which signs
      // private buckets and keeps public URLs for marketing asset buckets.
      onChange(data.path);
      
      toast({
        title: "Success",
        description: "Image uploaded successfully"
      });

    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error.message || "Failed to upload image"
      });
    } finally {
      setUploading(false);
    }
  };

  // Signed URLs expire, so the preview is resolved at render time rather
  // than stored. Handles both a path and a legacy absolute URL.
  const { url: previewUrl } = useStorageUrl(bucket, value);

  const handleUrlChange = (url: string) => {
    onChange(url);
  };

  const handleRemove = async () => {
    if (value) {
      // `value` is a storage path for anything uploaded since US-289, and a
      // full public URL for rows written before it. parseStorageUrl recovers
      // the path from the legacy form.
      const parsed = isAbsoluteUrl(value) ? parseStorageUrl(value) : { bucket, path: value };
      if (parsed) {
        try {
          await supabase.storage.from(parsed.bucket).remove([parsed.path]);
        } catch (error) {
          console.error('Error removing file:', error);
        }
      }
    }
    onChange('');
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={mode === 'upload' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMode('upload')}
          >
            <Upload className="h-3 w-3 mr-1" />
            Upload
          </Button>
          <Button
            type="button"
            variant={mode === 'url' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMode('url')}
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            URL
          </Button>
        </div>
      </div>

      {mode === 'upload' ? (
        <div className="space-y-3">
          <Input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={handleFileUpload}
            disabled={uploading}
            className="cursor-pointer"
          />
          {uploading && (
            <div className="text-sm text-muted-foreground">
              Uploading image...
            </div>
          )}
        </div>
      ) : (
        <Input
          placeholder={placeholder}
          value={value}
          onChange={(e) => handleUrlChange(e.target.value)}
        />
      )}

      {value && (
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center space-x-3">
              <div className="relative w-16 h-16 border rounded-lg overflow-hidden bg-muted">
                {value ? (
                  <img 
                    src={previewUrl ?? undefined} 
                    alt="Preview" 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {value.split('/').pop() || 'Image'}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {value}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRemove}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
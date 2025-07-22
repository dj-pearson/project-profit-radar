import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, X, Image as ImageIcon, ExternalLink } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

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

      // Create unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = path ? `${path}/${fileName}` : fileName;

      // Upload file to Supabase Storage
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

      onChange(publicUrl);
      
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

  const handleUrlChange = (url: string) => {
    onChange(url);
  };

  const handleRemove = async () => {
    if (value && value.includes(bucket)) {
      try {
        // Extract file path from URL
        const url = new URL(value);
        const pathParts = url.pathname.split('/');
        const filePath = pathParts.slice(pathParts.indexOf(bucket) + 1).join('/');

        // Remove from storage
        await supabase.storage
          .from(bucket)
          .remove([filePath]);
      } catch (error) {
        console.error('Error removing file:', error);
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
                    src={value} 
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
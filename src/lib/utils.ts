import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

/**
 * Get the base URL for Supabase storage
 * Uses the VITE_SUPABASE_URL environment variable
 */
export function getStorageUrl(): string {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://api.build-desk.com';
  return `${supabaseUrl}/storage/v1/object/public`;
}

/**
 * Get the full URL for a storage asset
 * @param bucket - The storage bucket name (e.g., 'site-assets')
 * @param path - The path to the file within the bucket (e.g., 'BuildDeskLogo.png')
 * @param options - Optional query params like width, quality
 */
export function getAssetUrl(bucket: string, path: string, options?: { width?: number; quality?: number }): string {
  let url = `${getStorageUrl()}/${bucket}/${path}`;

  if (options) {
    const params = new URLSearchParams();
    if (options.width) params.set('width', options.width.toString());
    if (options.quality) params.set('quality', options.quality.toString());
    const queryString = params.toString();
    if (queryString) url += `?${queryString}`;
  }

  return url;
}

/**
 * Default BuildDesk logo URL
 */
export const BUILDDESK_LOGO_URL = getAssetUrl('site-assets', 'BuildDeskLogo.png', { width: 200, quality: 90 });

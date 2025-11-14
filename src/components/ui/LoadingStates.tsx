/**
 * Loading States
 * Various loading indicators for different scenarios
 * Provides visual feedback during async operations
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, RefreshCw, Upload, Download, CheckCircle } from 'lucide-react';

interface LoadingProps {
  text?: string;
  size?: 'sm' | 'md' | 'lg';
}

// Spinner Loading
export const SpinnerLoading: React.FC<LoadingProps> = ({ text, size = 'md' }) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  };

  return (
    <div className="flex items-center justify-center gap-3">
      <Loader2 className={`${sizeClasses[size]} animate-spin text-blue-600`} />
      {text && <span className="text-sm text-muted-foreground">{text}</span>}
    </div>
  );
};

// Full Page Loading
export const FullPageLoading: React.FC<{ text?: string }> = ({ text = 'Loading...' }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
        <p className="text-lg text-muted-foreground">{text}</p>
      </div>
    </div>
  );
};

// Card Loading
export const CardLoading: React.FC<{ text?: string }> = ({ text = 'Loading...' }) => {
  return (
    <Card>
      <CardContent className="pt-12 pb-12">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">{text}</p>
        </div>
      </CardContent>
    </Card>
  );
};

// Inline Loading
export const InlineLoading: React.FC<{ text?: string }> = ({ text }) => {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      {text && <span>{text}</span>}
    </div>
  );
};

// Refreshing Indicator
export const RefreshingIndicator: React.FC<{ text?: string }> = ({
  text = 'Refreshing...'
}) => {
  return (
    <div className="flex items-center gap-2 text-sm text-blue-600">
      <RefreshCw className="h-4 w-4 animate-spin" />
      <span>{text}</span>
    </div>
  );
};

// Upload Progress
interface UploadProgressProps {
  progress: number; // 0-100
  fileName?: string;
}

export const UploadProgress: React.FC<UploadProgressProps> = ({ progress, fileName }) => {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            {progress < 100 ? (
              <Upload className="h-5 w-5 text-blue-600 animate-pulse" />
            ) : (
              <CheckCircle className="h-5 w-5 text-green-600" />
            )}
            <div className="flex-1">
              <p className="text-sm font-medium">
                {progress < 100 ? 'Uploading...' : 'Upload Complete'}
              </p>
              {fileName && <p className="text-xs text-muted-foreground">{fileName}</p>}
            </div>
            <span className="text-sm font-semibold">{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Download Progress
interface DownloadProgressProps {
  progress: number; // 0-100
  fileName?: string;
}

export const DownloadProgress: React.FC<DownloadProgressProps> = ({ progress, fileName }) => {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            {progress < 100 ? (
              <Download className="h-5 w-5 text-blue-600 animate-pulse" />
            ) : (
              <CheckCircle className="h-5 w-5 text-green-600" />
            )}
            <div className="flex-1">
              <p className="text-sm font-medium">
                {progress < 100 ? 'Downloading...' : 'Download Complete'}
              </p>
              {fileName && <p className="text-xs text-muted-foreground">{fileName}</p>}
            </div>
            <span className="text-sm font-semibold">{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Dots Loading
export const DotsLoading: React.FC = () => {
  return (
    <div className="flex items-center gap-1">
      <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.3s]" />
      <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.15s]" />
      <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" />
    </div>
  );
};

// Pulse Loading
export const PulseLoading: React.FC = () => {
  return (
    <div className="flex items-center gap-2">
      <div className="w-3 h-3 bg-blue-600 rounded-full animate-pulse" />
      <div className="w-3 h-3 bg-blue-600 rounded-full animate-pulse [animation-delay:0.2s]" />
      <div className="w-3 h-3 bg-blue-600 rounded-full animate-pulse [animation-delay:0.4s]" />
    </div>
  );
};

// Skeleton Text
export const SkeletonText: React.FC<{ lines?: number }> = ({ lines = 3 }) => {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 bg-gray-200 rounded animate-pulse"
          style={{ width: `${100 - i * 15}%` }}
        />
      ))}
    </div>
  );
};

// Processing Indicator
export const ProcessingIndicator: React.FC<{ step: string; total?: number; current?: number }> = ({
  step,
  total,
  current
}) => {
  return (
    <div className="flex items-center gap-3">
      <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
      <div>
        <p className="text-sm font-medium">{step}</p>
        {total && current && (
          <p className="text-xs text-muted-foreground">
            Step {current} of {total}
          </p>
        )}
      </div>
    </div>
  );
};

// Button Loading
interface ButtonLoadingProps {
  isLoading: boolean;
  loadingText?: string;
  children: React.ReactNode;
}

export const ButtonLoading: React.FC<ButtonLoadingProps> = ({
  isLoading,
  loadingText = 'Loading...',
  children
}) => {
  return (
    <>
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          {loadingText}
        </>
      ) : (
        children
      )}
    </>
  );
};

// Overlay Loading
export const OverlayLoading: React.FC<{ text?: string }> = ({ text = 'Loading...' }) => {
  return (
    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">{text}</p>
      </div>
    </div>
  );
};

export default SpinnerLoading;

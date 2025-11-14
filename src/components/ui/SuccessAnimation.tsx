/**
 * Success Animations
 * Animated success feedback components
 * Provides visual confirmation for completed actions
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, Check, Sparkles, ThumbsUp, PartyPopper } from 'lucide-react';

interface SuccessAnimationProps {
  message?: string;
  onComplete?: () => void;
  autoClose?: boolean;
  autoCloseDelay?: number; // in milliseconds
}

// Checkmark Animation
export const CheckmarkSuccess: React.FC<SuccessAnimationProps> = ({
  message = 'Success!',
  onComplete,
  autoClose = false,
  autoCloseDelay = 2000
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (autoClose) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onComplete?.();
      }, autoCloseDelay);

      return () => clearTimeout(timer);
    }
  }, [autoClose, autoCloseDelay, onComplete]);

  if (!isVisible) return null;

  return (
    <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg animate-in fade-in slide-in-from-top-2">
      <div className="relative">
        <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-25" />
        <CheckCircle className="h-6 w-6 text-green-600 relative z-10" />
      </div>
      <span className="text-sm font-medium text-green-900">{message}</span>
    </div>
  );
};

// Full Screen Success
export const FullScreenSuccess: React.FC<SuccessAnimationProps> = ({
  message = 'Success!',
  onComplete,
  autoClose = true,
  autoCloseDelay = 2000
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (autoClose) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onComplete?.();
      }, autoCloseDelay);

      return () => clearTimeout(timer);
    }
  }, [autoClose, autoCloseDelay, onComplete]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in">
      <div className="bg-white rounded-lg p-8 text-center animate-in zoom-in-95">
        <div className="relative inline-block mb-4">
          <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-25" />
          <div className="relative z-10 w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
            <Check className="h-8 w-8 text-white animate-in zoom-in-95 delay-150" />
          </div>
        </div>
        <h2 className="text-2xl font-bold mb-2 animate-in fade-in slide-in-from-bottom-2 delay-300">
          {message}
        </h2>
      </div>
    </div>
  );
};

// Card Success
export const CardSuccess: React.FC<SuccessAnimationProps> = ({ message = 'Success!' }) => {
  return (
    <Card className="border-green-200 bg-green-50 animate-in fade-in slide-in-from-bottom-4">
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <CheckCircle className="h-6 w-6 text-green-600" />
          <div>
            <p className="font-medium text-green-900">{message}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Toast Success (inline notification)
export const ToastSuccess: React.FC<SuccessAnimationProps> = ({
  message = 'Success!',
  onComplete,
  autoClose = true,
  autoCloseDelay = 3000
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (autoClose) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onComplete?.();
      }, autoCloseDelay);

      return () => clearTimeout(timer);
    }
  }, [autoClose, autoCloseDelay, onComplete]);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-right">
      <Card className="border-green-200 bg-green-50 shadow-lg">
        <CardContent className="pt-4 pb-4 pr-8">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium text-green-900">{message}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Confetti Success
export const ConfettiSuccess: React.FC<SuccessAnimationProps> = ({
  message = 'Congratulations!',
  onComplete
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      onComplete?.();
    }, 3000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in">
      <div className="bg-white rounded-lg p-8 text-center max-w-md">
        <div className="relative mb-4">
          <PartyPopper className="h-16 w-16 text-yellow-500 mx-auto animate-bounce" />
          <Sparkles className="h-6 w-6 text-yellow-400 absolute top-0 right-1/3 animate-ping" />
          <Sparkles className="h-6 w-6 text-blue-400 absolute bottom-0 left-1/3 animate-ping delay-150" />
        </div>
        <h2 className="text-2xl font-bold mb-2">{message}</h2>
        <p className="text-muted-foreground">You're all set!</p>
      </div>
    </div>
  );
};

// Thumbs Up Success
export const ThumbsUpSuccess: React.FC<SuccessAnimationProps> = ({
  message = 'Great job!'
}) => {
  return (
    <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg animate-in fade-in slide-in-from-bottom-2">
      <ThumbsUp className="h-6 w-6 text-blue-600 animate-bounce" />
      <span className="text-sm font-medium text-blue-900">{message}</span>
    </div>
  );
};

// Progress Complete
interface ProgressCompleteProps {
  title: string;
  description?: string;
  onContinue?: () => void;
}

export const ProgressComplete: React.FC<ProgressCompleteProps> = ({
  title,
  description,
  onContinue
}) => {
  return (
    <Card className="border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
      <CardContent className="pt-12 pb-12 text-center">
        <div className="relative inline-block mb-6">
          <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-25" />
          <div className="relative z-10 w-20 h-20 bg-green-500 rounded-full flex items-center justify-center">
            <Check className="h-10 w-10 text-white" />
          </div>
        </div>
        <h2 className="text-2xl font-bold mb-2">{title}</h2>
        {description && <p className="text-muted-foreground mb-6">{description}</p>}
        {onContinue && (
          <button
            onClick={onContinue}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Continue
          </button>
        )}
      </CardContent>
    </Card>
  );
};

// Badge Success (small inline indicator)
export const BadgeSuccess: React.FC<{ text?: string }> = ({ text = 'Saved' }) => {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded animate-in fade-in zoom-in-95">
      <Check className="h-3 w-3" />
      {text}
    </span>
  );
};

export default CheckmarkSuccess;

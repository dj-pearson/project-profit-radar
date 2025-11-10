/**
 * Social Share Component
 * Allows users to share the calculator on social media
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Share2, Twitter, Linkedin, Facebook, Link2 } from 'lucide-react';
import { toast } from 'sonner';

interface SocialShareProps {
  onShare: (platform: string) => void;
}

export function SocialShare({ onShare }: SocialShareProps) {
  const calculatorUrl = 'https://build-desk.com/calculator';
  const shareText = 'Just validated project profitability in 2 minutes with BuildDesk\'s free calculator. Game changer for contractors.';

  const handleTwitterShare = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(calculatorUrl)}&via=BuildDesk`;
    window.open(url, '_blank', 'width=600,height=400');
    onShare('twitter');
  };

  const handleLinkedInShare = () => {
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(calculatorUrl)}`;
    window.open(url, '_blank', 'width=600,height=600');
    onShare('linkedin');
  };

  const handleFacebookShare = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(calculatorUrl)}`;
    window.open(url, '_blank', 'width=600,height=400');
    onShare('facebook');
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(calculatorUrl);
      toast.success('Link copied to clipboard!');
      onShare('copy_link');
    } catch (err) {
      toast.error('Failed to copy link');
    }
  };

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-100">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
            <Share2 className="w-6 h-6 text-white" />
          </div>
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Share This Calculator
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Help other contractors validate profitable projects
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleTwitterShare}
              className="gap-2"
            >
              <Twitter className="w-4 h-4" />
              Twitter
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLinkedInShare}
              className="gap-2"
            >
              <Linkedin className="w-4 h-4" />
              LinkedIn
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleFacebookShare}
              className="gap-2"
            >
              <Facebook className="w-4 h-4" />
              Facebook
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              className="gap-2"
            >
              <Link2 className="w-4 h-4" />
              Copy Link
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

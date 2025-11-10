/**
 * Email Capture Modal Component
 * Appears after calculation to capture lead information
 */

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download, TrendingUp, Users } from 'lucide-react';

interface EmailCaptureModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { email: string; companyName?: string; phone?: string }) => void;
  calculationCount: number;
}

export function EmailCaptureModal({
  open,
  onClose,
  onSubmit,
  calculationCount
}: EmailCaptureModalProps) {
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit({
        email,
        companyName: companyName || undefined,
        phone: phone || undefined
      });

      // Reset form
      setEmail('');
      setCompanyName('');
      setPhone('');
      onClose();
    } catch (err) {
      setError('Failed to save your information. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-blue-100 rounded-full">
            <Download className="w-6 h-6 text-blue-600" />
          </div>
          <DialogTitle className="text-2xl text-center">
            Download Your Full Profitability Report
          </DialogTitle>
          <DialogDescription className="text-center">
            Get a detailed PDF analysis and save your calculation for future reference
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Value propositions */}
          <div className="bg-blue-50 rounded-lg p-4 space-y-3">
            <div className="flex items-start gap-3">
              <Download className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <strong>PDF Download:</strong> Full profitability report with benchmarks
              </div>
            </div>
            <div className="flex items-start gap-3">
              <TrendingUp className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <strong>Save for Comparison:</strong> Compare up to 3 previous projects
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Users className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <strong>Join 847 contractors</strong> maximizing profits with BuildDesk
              </div>
            </div>
          </div>

          {/* Form fields */}
          <div className="space-y-3">
            <div>
              <Label htmlFor="email" className="text-sm font-medium">
                Email Address <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="companyName" className="text-sm font-medium">
                Company Name (Optional)
              </Label>
              <Input
                id="companyName"
                type="text"
                placeholder="Your Company"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="phone" className="text-sm font-medium">
                Phone (Optional - Get tips via text)
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="(555) 123-4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isSubmitting}
            >
              Maybe Later
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                'Processing...'
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Get My Report
                </>
              )}
            </Button>
          </div>

          <p className="text-xs text-center text-gray-500">
            We respect your privacy. Unsubscribe anytime.
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}

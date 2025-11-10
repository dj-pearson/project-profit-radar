/**
 * Upgrade CTA Component
 * Encourages users to start a trial of BuildDesk
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, Check } from 'lucide-react';
import { Link } from 'react-router-dom';

interface UpgradeCTAProps {
  onTrialClick: () => void;
  compact?: boolean;
}

export function UpgradeCTA({ onTrialClick, compact = false }: UpgradeCTAProps) {
  if (compact) {
    return (
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold mb-1">
              Track ALL Projects Automatically
            </h3>
            <p className="text-blue-100 text-sm">
              You calculated profit for 1 project. Track unlimited projects in real-time with BuildDesk.
            </p>
          </div>
          <Button
            size="lg"
            onClick={onTrialClick}
            className="bg-white text-blue-600 hover:bg-blue-50 flex-shrink-0"
            asChild
          >
            <Link to="/auth?mode=signup">
              Start Free Trial
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border-2 border-blue-600 overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white text-center">
        <h2 className="text-2xl font-bold mb-2">
          Upgrade to BuildDesk Platform
        </h2>
        <p className="text-blue-100">
          Stop calculating one project at a time. Track everything automatically.
        </p>
      </div>

      <div className="p-8">
        {/* Comparison Table */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Free Calculator */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900 mb-4 pb-2 border-b">
              Free Calculator
            </h3>
            <div className="flex items-start gap-2 text-sm text-gray-600">
              <Check className="w-5 h-5 flex-shrink-0 text-gray-400" />
              <span>One project at a time</span>
            </div>
            <div className="flex items-start gap-2 text-sm text-gray-600">
              <Check className="w-5 h-5 flex-shrink-0 text-gray-400" />
              <span>Manual entry</span>
            </div>
            <div className="flex items-start gap-2 text-sm text-gray-600">
              <Check className="w-5 h-5 flex-shrink-0 text-gray-400" />
              <span>No history tracking</span>
            </div>
            <div className="flex items-start gap-2 text-sm text-gray-600">
              <Check className="w-5 h-5 flex-shrink-0 text-gray-400" />
              <span>Results disappear</span>
            </div>
          </div>

          {/* BuildDesk Platform */}
          <div className="space-y-3 bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-4 pb-2 border-b border-blue-200">
              BuildDesk Platform
            </h3>
            <div className="flex items-start gap-2 text-sm text-gray-900">
              <Check className="w-5 h-5 flex-shrink-0 text-blue-600" />
              <span><strong>Unlimited</strong> projects</span>
            </div>
            <div className="flex items-start gap-2 text-sm text-gray-900">
              <Check className="w-5 h-5 flex-shrink-0 text-blue-600" />
              <span><strong>Auto-tracking</strong> from crew timesheets</span>
            </div>
            <div className="flex items-start gap-2 text-sm text-gray-900">
              <Check className="w-5 h-5 flex-shrink-0 text-blue-600" />
              <span><strong>Real-time</strong> profit updates</span>
            </div>
            <div className="flex items-start gap-2 text-sm text-gray-900">
              <Check className="w-5 h-5 flex-shrink-0 text-blue-600" />
              <span><strong>Full crew management</strong> & scheduling</span>
            </div>
            <div className="flex items-start gap-2 text-sm text-gray-900">
              <Check className="w-5 h-5 flex-shrink-0 text-blue-600" />
              <span><strong>Change order</strong> impact calculator</span>
            </div>
            <div className="flex items-start gap-2 text-sm text-gray-900">
              <Check className="w-5 h-5 flex-shrink-0 text-blue-600" />
              <span><strong>Mobile app</strong> for field crews</span>
            </div>
          </div>
        </div>

        {/* Testimonial */}
        <div className="bg-gray-50 rounded-lg p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center text-gray-600 font-semibold">
              JM
            </div>
            <div>
              <p className="text-gray-700 italic mb-2">
                "BuildDesk helped us catch a $15K cost overrun on the Johnson remodel before it was too late. The real-time tracking paid for itself in the first month."
              </p>
              <p className="text-sm font-semibold text-gray-900">
                John Martinez, Martinez Construction
              </p>
              <p className="text-xs text-gray-600">
                Increased margins by 12% in first 6 months
              </p>
            </div>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="space-y-3">
          <Button
            size="lg"
            onClick={onTrialClick}
            className="w-full bg-blue-600 hover:bg-blue-700 text-lg py-6"
            asChild
          >
            <Link to="/auth?mode=signup">
              Start 14-Day Free Trial
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          </Button>
          <p className="text-center text-sm text-gray-600">
            No credit card required • Setup in 15 minutes • Cancel anytime
          </p>
        </div>

        {/* Social Proof */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            <strong className="text-gray-900">1,200+ contractors</strong> trust BuildDesk
          </p>
        </div>
      </div>
    </div>
  );
}

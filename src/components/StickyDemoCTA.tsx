import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, ArrowRight, Play } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface StickyDemoCTAProps {
  className?: string;
}

export const StickyDemoCTA: React.FC<StickyDemoCTAProps> = ({ className }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const checkScroll = () => {
      // Show after user scrolls 30% down the page
      const scrollPercent = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
      setIsVisible(scrollPercent > 30 && !isDismissed);
    };

    window.addEventListener('scroll', checkScroll);
    return () => window.removeEventListener('scroll', checkScroll);
  }, [isDismissed]);

  if (!isVisible) return null;

  return (
    <div 
      className={cn(
        "fixed bottom-4 right-4 z-50 bg-background border border-border rounded-lg shadow-lg p-4 max-w-sm transition-all duration-300 animate-slide-up",
        "bg-gradient-to-r from-construction-light/90 to-construction-orange/10 backdrop-blur-sm",
        className
      )}
    >
      {/* Close Button */}
      <button
        onClick={() => setIsDismissed(true)}
        className="absolute top-2 right-2 p-1 hover:bg-muted rounded-full transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4 text-muted-foreground" />
      </button>

      {/* Content */}
      <div className="space-y-3 pr-6">
        <div>
          <h3 className="font-semibold text-construction-dark text-sm">
            See BuildDesk in Action
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Watch how contractors save 23% on project costs
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant="hero"
            className="flex-1 text-xs h-8"
            asChild
          >
            <Link to="/auth">
              <ArrowRight className="h-3 w-3 mr-1" />
              Free Trial
            </Link>
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            className="flex-1 text-xs h-8"
            asChild
          >
            <Link to="/demo">
              <Play className="h-3 w-3 mr-1" />
              Demo
            </Link>
          </Button>
        </div>

        {/* Trust Signal */}
        <p className="text-xs text-muted-foreground text-center">
          ✓ No credit card required • ✓ Setup in 30 minutes
        </p>
      </div>
    </div>
  );
};

export default StickyDemoCTA;
import { useState, useEffect } from 'react';
import { X, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';

/**
 * Banner to prompt users to install the PWA
 */
export function InstallBanner() {
  const { isInstallable, promptInstall } = useInstallPrompt();
  const [isDismissed, setIsDismissed] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Check if user has previously dismissed
    const dismissed = localStorage.getItem('install-banner-dismissed');
    if (dismissed) {
      setIsDismissed(true);
      return;
    }

    // Show banner after a short delay
    const timer = setTimeout(() => {
      setShowBanner(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('install-banner-dismissed', 'true');
  };

  const handleInstall = async () => {
    const installed = await promptInstall();
    if (installed) {
      setIsDismissed(true);
    }
  };

  if (!isInstallable || isDismissed || !showBanner) {
    return null;
  }

  return (
    <div className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-background border rounded-lg shadow-lg p-4 z-50 animate-in slide-in-from-bottom-5">
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 p-1 rounded-full hover:bg-muted transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Download className="h-5 w-5 text-primary" />
        </div>
        
        <div className="flex-1">
          <h3 className="font-semibold mb-1">Install App</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Install our app for quick access and a better experience
          </p>

          <div className="flex gap-2">
            <Button onClick={handleInstall} size="sm" className="flex-1">
              Install
            </Button>
            <Button 
              onClick={handleDismiss} 
              variant="outline" 
              size="sm"
            >
              Not now
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

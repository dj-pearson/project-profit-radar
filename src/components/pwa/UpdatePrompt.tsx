import { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Prompt to reload when a new service worker is available
 */
export function UpdatePrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.ready.then((reg) => {
      setRegistration(reg);

      // Check for updates
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (
            newWorker.state === 'installed' &&
            navigator.serviceWorker.controller
          ) {
            // New service worker available
            setShowPrompt(true);
          }
        });
      });
    });

    // Check for updates on visibility change
    const handleVisibilityChange = () => {
      if (!document.hidden && registration) {
        registration.update();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [registration]);

  const handleUpdate = () => {
    if (registration?.waiting) {
      // Tell the service worker to skip waiting
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      
      // Reload the page
      window.location.reload();
    }
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-background border rounded-lg shadow-lg p-4 z-50">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <RefreshCw className="h-5 w-5 text-primary" />
        </div>
        
        <div className="flex-1">
          <h3 className="font-semibold mb-1">Update Available</h3>
          <p className="text-sm text-muted-foreground mb-3">
            A new version is available. Reload to update.
          </p>

          <div className="flex gap-2">
            <Button onClick={handleUpdate} size="sm" className="flex-1">
              Update Now
            </Button>
            <Button 
              onClick={() => setShowPrompt(false)} 
              variant="outline" 
              size="sm"
            >
              Later
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

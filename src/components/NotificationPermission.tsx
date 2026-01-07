import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Bell, X } from 'lucide-react';

export const NotificationPermission = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if notifications are supported and permission status
    if ('Notification' in window && 'serviceWorker' in navigator) {
      const permission = Notification.permission;
      const wasDismissed = localStorage.getItem('notification-permission-dismissed');
      
      if (permission === 'default' && !wasDismissed) {
        // Show prompt after 1 minute
        const timer = setTimeout(() => {
          setShowPrompt(true);
        }, 60000);
        
        return () => clearTimeout(timer);
      }
    }
  }, []);

  const requestPermission = async () => {
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setShowPrompt(false);
        // Register for push notifications
        await navigator.serviceWorker.ready;
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    setShowPrompt(false);
    localStorage.setItem('notification-permission-dismissed', 'true');
  };

  if (!showPrompt || dismissed || !('Notification' in window)) {
    return null;
  }

  return (
    <aside aria-label="Notification permission" className="fixed top-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-80">
      <Card className="p-4 bg-card border shadow-lg">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Bell className="w-5 h-5 text-primary" />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm text-foreground">
              Stay Updated
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Enable notifications to get project updates and reminders
            </p>

            <div className="flex gap-2 mt-3">
              <Button
                onClick={requestPermission}
                size="sm"
                className="text-xs"
              >
                <Bell className="w-3 h-3 mr-1" />
                Enable
              </Button>
              <Button
                onClick={handleDismiss}
                variant="ghost"
                size="sm"
                className="text-xs"
              >
                Not now
              </Button>
            </div>
          </div>

          <Button
            onClick={handleDismiss}
            variant="ghost"
            size="sm"
            className="flex-shrink-0 w-6 h-6 p-0"
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      </Card>
    </aside>
  );
};
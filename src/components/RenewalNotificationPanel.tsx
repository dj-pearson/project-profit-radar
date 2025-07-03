import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Bell, Clock, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const RenewalNotificationPanel = () => {
  const [loading, setLoading] = useState(false);
  const [lastCheck, setLastCheck] = useState<string | null>(null);
  const { toast } = useToast();

  const handleManualCheck = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-renewal-notification');
      
      if (error) throw error;
      
      setLastCheck(new Date().toISOString());
      toast({
        title: "Renewal Check Complete",
        description: `Sent ${data.notifications_sent || 0} renewal notifications`,
      });
    } catch (error) {
      console.error('Error checking renewals:', error);
      toast({
        title: "Error",
        description: "Failed to check renewal notifications",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Renewal Notifications
        </CardTitle>
        <CardDescription>
          Manage automatic renewal notifications for annual subscriptions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-construction-orange" />
            <div>
              <p className="text-sm font-medium">60 Days</p>
              <p className="text-xs text-muted-foreground">First reminder</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-construction-orange" />
            <div>
              <p className="text-sm font-medium">30 Days</p>
              <p className="text-xs text-muted-foreground">Second reminder</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-construction-orange" />
            <div>
              <p className="text-sm font-medium">7 Days</p>
              <p className="text-xs text-muted-foreground">Final reminder</p>
            </div>
          </div>
        </div>
        
        <div className="border-t pt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Manual Check</p>
              <p className="text-xs text-muted-foreground">
                {lastCheck 
                  ? `Last checked: ${new Date(lastCheck).toLocaleString()}`
                  : 'Never checked'
                }
              </p>
            </div>
            <Button 
              onClick={handleManualCheck}
              disabled={loading}
              size="sm"
            >
              {loading ? 'Checking...' : 'Check Now'}
            </Button>
          </div>
        </div>

        <div className="bg-muted/50 p-3 rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong>Automatic notifications:</strong> To enable daily automatic checks, 
            set up a cron job or scheduled task to call the renewal notification endpoint.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default RenewalNotificationPanel;
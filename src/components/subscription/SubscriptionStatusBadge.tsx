import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Clock, Crown, Gift, AlertTriangle, Check } from 'lucide-react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useNavigate } from 'react-router-dom';
import TrialConversion from '@/components/TrialConversion';

interface SubscriptionStatusBadgeProps {
  variant?: 'full' | 'compact';
  showIcon?: boolean;
}

export const SubscriptionStatusBadge: React.FC<SubscriptionStatusBadgeProps> = ({
  variant = 'full',
  showIcon = true
}) => {
  const { subscriptionStatus, subscriptionData, loading } = useSubscription();
  const [showTrialConversion, setShowTrialConversion] = useState(false);
  const navigate = useNavigate();

  if (loading || !subscriptionStatus) return null;

  const handleBadgeClick = () => {
    // Trial users → Show trial conversion
    if (subscriptionStatus.isTrial) {
      setShowTrialConversion(true);
      return;
    }

    // Suspended/Grace period users → Show trial conversion
    if (subscriptionStatus.isSuspended || subscriptionStatus.isGracePeriod) {
      setShowTrialConversion(true);
      return;
    }

    // Complimentary users → Navigate to subscription settings (view only)
    if (subscriptionStatus.isComplimentary) {
      navigate('/subscription-settings');
      return;
    }

    // Paid users → Navigate to subscription settings
    if (subscriptionStatus.isActive) {
      navigate('/subscription-settings');
      return;
    }
  };

  // Trial Status
  if (subscriptionStatus.isTrial && subscriptionStatus.trialDaysLeft !== null) {
    const daysLeft = subscriptionStatus.trialDaysLeft;
    const isWarning = daysLeft <= 7;

    return (
      <>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBadgeClick}
          className="h-8 px-2 hover:bg-orange-50 dark:hover:bg-orange-950"
        >
          <Badge className={`${isWarning ? 'bg-orange-500' : 'bg-blue-500'} text-white hover:bg-opacity-90 cursor-pointer`}>
            {showIcon && <Clock className="h-3 w-3 mr-1" />}
            {variant === 'full' ? `Trial: ${daysLeft}d left` : `${daysLeft}d`}
          </Badge>
        </Button>

        <Dialog open={showTrialConversion} onOpenChange={setShowTrialConversion}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Upgrade Your Account</DialogTitle>
            </DialogHeader>
            <TrialConversion
              trialData={{
                daysLeft: subscriptionStatus.trialDaysLeft || 0,
                isExpired: false,
                subscriptionStatus: 'trial'
              }}
              onConversionStarted={() => setShowTrialConversion(false)}
            />
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Grace Period
  if (subscriptionStatus.isGracePeriod && subscriptionStatus.graceDaysLeft !== null) {
    return (
      <>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBadgeClick}
          className="h-8 px-2 hover:bg-amber-50 dark:hover:bg-amber-950"
        >
          <Badge className="bg-amber-500 text-white hover:bg-opacity-90 cursor-pointer">
            {showIcon && <AlertTriangle className="h-3 w-3 mr-1" />}
            {variant === 'full' ? `Grace: ${subscriptionStatus.graceDaysLeft}d` : `${subscriptionStatus.graceDaysLeft}d`}
          </Badge>
        </Button>

        <Dialog open={showTrialConversion} onOpenChange={setShowTrialConversion}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Reactivate Your Account</DialogTitle>
            </DialogHeader>
            <TrialConversion
              trialData={{
                daysLeft: 0,
                isExpired: true,
                isGracePeriod: true,
                graceDaysLeft: subscriptionStatus.graceDaysLeft,
                subscriptionStatus: 'grace_period'
              }}
              onConversionStarted={() => setShowTrialConversion(false)}
            />
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Suspended
  if (subscriptionStatus.isSuspended) {
    return (
      <>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBadgeClick}
          className="h-8 px-2 hover:bg-red-50 dark:hover:bg-red-950"
        >
          <Badge className="bg-red-500 text-white hover:bg-opacity-90 cursor-pointer">
            {showIcon && <AlertTriangle className="h-3 w-3 mr-1" />}
            {variant === 'full' ? 'Upgrade Required' : 'Suspended'}
          </Badge>
        </Button>

        <Dialog open={showTrialConversion} onOpenChange={setShowTrialConversion}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Reactivate Your Account</DialogTitle>
            </DialogHeader>
            <TrialConversion
              trialData={{
                daysLeft: 0,
                isExpired: true,
                subscriptionStatus: 'suspended'
              }}
              onConversionStarted={() => setShowTrialConversion(false)}
            />
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Complimentary
  if (subscriptionStatus.isComplimentary) {
    const tierName = subscriptionStatus.tier.charAt(0).toUpperCase() + subscriptionStatus.tier.slice(1);

    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={handleBadgeClick}
        className="h-8 px-2 hover:bg-purple-50 dark:hover:bg-purple-950"
      >
        <Badge className="bg-purple-500 text-white hover:bg-opacity-90 cursor-pointer">
          {showIcon && <Gift className="h-3 w-3 mr-1" />}
          {variant === 'full' ? `Complimentary ${tierName}` : 'Complimentary'}
        </Badge>
      </Button>
    );
  }

  // Active Paid Subscription
  if (subscriptionStatus.isActive && subscriptionData) {
    const tierName = subscriptionStatus.tier.charAt(0).toUpperCase() + subscriptionStatus.tier.slice(1);
    const isEnterprise = subscriptionStatus.tier === 'enterprise';

    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={handleBadgeClick}
        className={`h-8 px-2 ${isEnterprise ? 'hover:bg-green-50 dark:hover:bg-green-950' : 'hover:bg-blue-50 dark:hover:bg-blue-950'}`}
      >
        <Badge className={`${isEnterprise ? 'bg-green-600' : 'bg-blue-600'} text-white hover:bg-opacity-90 cursor-pointer`}>
          {showIcon && (isEnterprise ? <Crown className="h-3 w-3 mr-1" /> : <Check className="h-3 w-3 mr-1" />)}
          {variant === 'full' ? tierName : tierName.substring(0, 3)}
        </Badge>
      </Button>
    );
  }

  // Inactive (should rarely show)
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleBadgeClick}
      className="h-8 px-2 hover:bg-gray-50 dark:hover:bg-gray-950"
    >
      <Badge variant="outline" className="cursor-pointer">
        {variant === 'full' ? 'No Plan' : 'Free'}
      </Badge>
    </Button>
  );
};

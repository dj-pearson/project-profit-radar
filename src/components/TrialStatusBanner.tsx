import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Clock, CreditCard, AlertTriangle } from 'lucide-react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import TrialConversion from './TrialConversion';

const TrialStatusBanner = () => {
  const { subscriptionStatus, loading } = useSubscription();
  const [showConversionModal, setShowConversionModal] = useState(false);

  const handleUpgrade = () => {
    setShowConversionModal(true);
  };

  const handleConversionStarted = () => {
    setShowConversionModal(false);
  };

  // Don't show banner if:
  // - Loading
  // - No subscription status
  // - User has active subscription
  // - User is on complimentary subscription
  if (loading || !subscriptionStatus) {
    return null;
  }

  if (subscriptionStatus.isActive || subscriptionStatus.isComplimentary) {
    return null;
  }

  const { isTrial, isGracePeriod, isSuspended, trialDaysLeft, graceDaysLeft } = subscriptionStatus;

  // Prepare trial data for conversion modal
  const trialData = {
    daysLeft: trialDaysLeft || 0,
    isExpired: isTrial && (trialDaysLeft || 0) <= 0,
    subscriptionStatus: isSuspended ? 'suspended' : isGracePeriod ? 'grace_period' : 'trial',
    isGracePeriod,
    graceDaysLeft
  };

  // Component for the modal to avoid repetition
  const TrialConversionModal = () => (
    <Dialog open={showConversionModal} onOpenChange={setShowConversionModal}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upgrade Your Account</DialogTitle>
        </DialogHeader>
        <TrialConversion
          trialData={trialData}
          onConversionStarted={handleConversionStarted}
        />
      </DialogContent>
    </Dialog>
  );

  // Show suspended status
  if (isSuspended) {
    return (
      <>
        <Card className="border-destructive bg-destructive/10 mb-6">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <div>
                <h3 className="font-semibold text-destructive">Account Suspended</h3>
                <p className="text-sm text-muted-foreground">
                  Your trial and grace period have expired. Upgrade to reactivate your account.
                </p>
              </div>
            </div>
            <Button
              onClick={handleUpgrade}
              className="bg-destructive hover:bg-destructive/90"
            >
              <CreditCard className="mr-2 h-4 w-4" />
              Reactivate Account
            </Button>
          </CardContent>
        </Card>
        <TrialConversionModal />
      </>
    );
  }

  // Show grace period status
  if (isGracePeriod && graceDaysLeft !== null) {
    return (
      <>
        <Card className="border-amber-500 bg-amber-50 mb-6">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center space-x-3">
              <Clock className="h-5 w-5 text-amber-600" />
              <div>
                <h3 className="font-semibold text-amber-700">Grace Period Active</h3>
                <p className="text-sm text-amber-600">
                  {graceDaysLeft} day{graceDaysLeft !== 1 ? 's' : ''} left in your grace period.
                  Limited features available.
                </p>
              </div>
            </div>
            <Button
              onClick={handleUpgrade}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              <CreditCard className="mr-2 h-4 w-4" />
              Upgrade Now
            </Button>
          </CardContent>
        </Card>
        <TrialConversionModal />
      </>
    );
  }

  // Show trial expiration warning (when trial expired but grace period exists)
  if (isTrial && trialDaysLeft !== null && trialDaysLeft <= 0 && !isGracePeriod) {
    return (
      <>
        <Card className="border-destructive bg-destructive/5 mb-6">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <div>
                <h3 className="font-semibold text-destructive">Trial Expired</h3>
                <p className="text-sm text-muted-foreground">
                  Your trial has ended. Upgrade now to continue using all features.
                </p>
              </div>
            </div>
            <Button
              onClick={handleUpgrade}
              className="bg-destructive hover:bg-destructive/90"
            >
              <CreditCard className="mr-2 h-4 w-4" />
              Upgrade Now
            </Button>
          </CardContent>
        </Card>
        <TrialConversionModal />
      </>
    );
  }

  // Show trial ending soon warning (≤7 days)
  if (isTrial && trialDaysLeft !== null && trialDaysLeft > 0 && trialDaysLeft <= 7) {
    return (
      <>
        <Card className="border-construction-orange bg-construction-orange/5 mb-6">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center space-x-3">
              <Clock className="h-5 w-5 text-construction-orange" />
              <div>
                <h3 className="font-semibold text-construction-orange">
                  Trial Ending Soon
                </h3>
                <p className="text-sm text-muted-foreground">
                  {trialDaysLeft} day{trialDaysLeft !== 1 ? 's' : ''} left in your free trial
                </p>
              </div>
            </div>
            <Button
              onClick={handleUpgrade}
              variant="construction"
            >
              <CreditCard className="mr-2 h-4 w-4" />
              Upgrade Now
            </Button>
          </CardContent>
        </Card>
        <TrialConversionModal />
      </>
    );
  }

  return null;
};

export default TrialStatusBanner;

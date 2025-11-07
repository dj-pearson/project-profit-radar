import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Crown, Users, FolderKanban, HardDrive, TrendingUp, Gift } from 'lucide-react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useNavigate } from 'react-router-dom';

export const SubscriptionUsageWidget: React.FC = () => {
  const {
    subscriptionData,
    subscriptionStatus,
    usage,
    limits,
    loading,
    hasUnlimitedAccess
  } = useSubscription();
  const navigate = useNavigate();

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-construction-orange"></div>
        </CardContent>
      </Card>
    );
  }

  if (!subscriptionData) return null;

  const getTierDisplayName = (tier: string) => {
    const tierNames: Record<string, string> = {
      starter: 'Starter',
      professional: 'Professional',
      enterprise: 'Enterprise'
    };
    return tierNames[tier] || tier;
  };

  const getUsagePercentage = (current: number, limit: number): number => {
    if (limit === -1) return 0; // Unlimited
    return Math.min((current / limit) * 100, 100);
  };

  const getProgressColor = (percentage: number): string => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 80) return 'bg-orange-500';
    return 'bg-green-500';
  };

  const getUsageStatus = (current: number, limit: number) => {
    if (limit === -1) return { status: 'unlimited', color: 'text-green-600' };
    const percentage = getUsagePercentage(current, limit);
    if (percentage >= 90) return { status: 'critical', color: 'text-red-600' };
    if (percentage >= 80) return { status: 'warning', color: 'text-orange-600' };
    return { status: 'healthy', color: 'text-green-600' };
  };

  const teamMembersStatus = getUsageStatus(usage.teamMembers, limits.teamMembers);
  const projectsStatus = getUsageStatus(usage.projects, limits.projects);
  const storageStatus = getUsageStatus(usage.storage, limits.storage);

  const anyLimitApproaching = teamMembersStatus.status === 'warning' ||
                               projectsStatus.status === 'warning' ||
                               storageStatus.status === 'warning' ||
                               teamMembersStatus.status === 'critical' ||
                               projectsStatus.status === 'critical' ||
                               storageStatus.status === 'critical';

  const tierName = getTierDisplayName(subscriptionData.subscription_tier || 'starter');

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Crown className="h-5 w-5 text-construction-orange" />
              Your Plan
            </CardTitle>
            <CardDescription>Subscription usage and limits</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {subscriptionData.is_complimentary ? (
              <Badge className="bg-purple-500 text-white">
                <Gift className="h-3 w-3 mr-1" />
                Complimentary
              </Badge>
            ) : hasUnlimitedAccess() ? (
              <Badge className="bg-green-600 text-white">
                <Crown className="h-3 w-3 mr-1" />
                {tierName}
              </Badge>
            ) : (
              <Badge className="bg-blue-600 text-white">
                {tierName}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Trial Warning */}
        {subscriptionStatus?.isTrial && subscriptionStatus.trialDaysLeft !== null && subscriptionStatus.trialDaysLeft <= 7 && (
          <div className="p-3 bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-md">
            <p className="text-sm text-orange-800 dark:text-orange-200">
              <strong>{subscriptionStatus.trialDaysLeft} days left</strong> in your trial
            </p>
          </div>
        )}

        {/* Grace Period Warning */}
        {subscriptionStatus?.isGracePeriod && subscriptionStatus.graceDaysLeft !== null && (
          <div className="p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <strong>{subscriptionStatus.graceDaysLeft} days left</strong> in grace period
            </p>
          </div>
        )}

        {/* Usage Metrics */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Usage This Month</h4>

          {/* Team Members */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>Team Members</span>
              </div>
              <span className={teamMembersStatus.color}>
                {usage.teamMembers} / {limits.teamMembers === -1 ? '∞' : limits.teamMembers}
              </span>
            </div>
            {limits.teamMembers !== -1 && (
              <Progress
                value={getUsagePercentage(usage.teamMembers, limits.teamMembers)}
                className="h-2"
                indicatorClassName={getProgressColor(getUsagePercentage(usage.teamMembers, limits.teamMembers))}
              />
            )}
          </div>

          {/* Projects */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <FolderKanban className="h-4 w-4 text-muted-foreground" />
                <span>Projects</span>
              </div>
              <span className={projectsStatus.color}>
                {usage.projects} / {limits.projects === -1 ? '∞' : limits.projects}
              </span>
            </div>
            {limits.projects !== -1 && (
              <Progress
                value={getUsagePercentage(usage.projects, limits.projects)}
                className="h-2"
                indicatorClassName={getProgressColor(getUsagePercentage(usage.projects, limits.projects))}
              />
            )}
          </div>

          {/* Storage (if tracked) */}
          {limits.storage !== 0 && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <HardDrive className="h-4 w-4 text-muted-foreground" />
                  <span>Storage</span>
                </div>
                <span className={storageStatus.color}>
                  {usage.storage} / {limits.storage === -1 ? '∞' : `${limits.storage} GB`}
                </span>
              </div>
              {limits.storage !== -1 && (
                <Progress
                  value={getUsagePercentage(usage.storage, limits.storage)}
                  className="h-2"
                  indicatorClassName={getProgressColor(getUsagePercentage(usage.storage, limits.storage))}
                />
              )}
            </div>
          )}
        </div>

        {/* Upgrade CTA */}
        {anyLimitApproaching && !hasUnlimitedAccess() && !subscriptionData.is_complimentary && (
          <div className="pt-2">
            <Button
              onClick={() => navigate('/subscription-settings')}
              className="w-full bg-construction-orange hover:bg-construction-orange/90"
              size="sm"
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Upgrade for More Capacity
            </Button>
          </div>
        )}

        {/* Complimentary Message */}
        {subscriptionData.is_complimentary && (
          <div className="pt-2 text-center">
            <p className="text-xs text-muted-foreground">
              You have complimentary access to {tierName} features
            </p>
          </div>
        )}

        {/* Unlimited Message */}
        {hasUnlimitedAccess() && !subscriptionData.is_complimentary && (
          <div className="pt-2 text-center">
            <p className="text-xs text-muted-foreground">
              You have unlimited access to all features
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

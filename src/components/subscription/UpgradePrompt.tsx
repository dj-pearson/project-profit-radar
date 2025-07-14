import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Crown, Users, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface UpgradePromptProps {
  isOpen: boolean;
  onClose: () => void;
  currentTier: string;
  requiredTier: string;
  limitType: 'teamMembers' | 'projects';
  currentUsage: number;
  currentLimit: number;
}

const TIER_FEATURES = {
  professional: {
    name: 'Professional',
    price: '$299/month',
    teamMembers: 20,
    projects: 50,
    features: [
      'Up to 20 team members',
      'Up to 50 active projects',
      'Advanced reporting',
      'Priority support',
      'Mobile app access'
    ]
  },
  enterprise: {
    name: 'Enterprise',
    price: '$599/month',
    teamMembers: 'Unlimited',
    projects: 'Unlimited',
    features: [
      'Unlimited team members',
      'Unlimited projects',
      'Advanced analytics',
      'Custom integrations',
      'Dedicated support',
      'SLA guarantee'
    ]
  }
};

const UpgradePrompt: React.FC<UpgradePromptProps> = ({
  isOpen,
  onClose,
  currentTier,
  requiredTier,
  limitType,
  currentUsage,
  currentLimit
}) => {
  const navigate = useNavigate();

  const handleUpgrade = () => {
    onClose();
    navigate('/subscription');
  };

  const tierInfo = TIER_FEATURES[requiredTier as keyof typeof TIER_FEATURES];
  const limitTypeDisplay = limitType === 'teamMembers' ? 'team members' : 'projects';

  if (!tierInfo) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-construction-orange" />
            Upgrade Required
          </DialogTitle>
          <DialogDescription>
            You've reached your {limitTypeDisplay} limit ({currentUsage}/{currentLimit}). 
            Upgrade to add more {limitTypeDisplay} to your account.
          </DialogDescription>
        </DialogHeader>

        <Card className="border-construction-orange/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">{tierInfo.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-2xl font-bold text-construction-orange">
                    {tierInfo.price}
                  </span>
                  <Badge variant="secondary">Recommended</Badge>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  {tierInfo.teamMembers} team members
                </div>
                <div className="text-sm text-muted-foreground">
                  {tierInfo.projects} projects
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-sm">What you'll get:</h4>
              <div className="grid gap-2">
                {tierInfo.features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-600 shrink-0" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col-reverse sm:flex-row gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Maybe Later
          </Button>
          <Button 
            onClick={handleUpgrade} 
            className="flex-1 bg-construction-orange hover:bg-construction-orange/90"
          >
            <span>Upgrade Now</span>
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          You can change or cancel your subscription at any time
        </p>
      </DialogContent>
    </Dialog>
  );
};

export default UpgradePrompt;
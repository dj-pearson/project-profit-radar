import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Copy,
  Check,
  Gift,
  Users,
  DollarSign,
  Share2,
  Mail,
  MessageCircle,
  Twitter,
  Facebook,
  Linkedin,
  TrendingUp,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

interface ReferralCode {
  id: string;
  code: string;
  current_uses: number;
  max_uses: number | null;
  referrer_reward_amount: number;
  referee_reward_amount: number;
}

interface ReferralStats {
  total_referrals: number;
  successful_referrals: number;
  pending_referrals: number;
  total_rewards_earned: number;
  conversion_rate: number;
}

interface Referral {
  id: string;
  referee_email: string;
  referee_name: string;
  status: string;
  referral_date: string;
  converted_to_paid: boolean;
  referrer_reward_amount: number;
  referrer_rewarded: boolean;
}

export const ReferralProgram = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [referralCode, setReferralCode] = useState<ReferralCode | null>(null);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (user) {
      loadReferralData();
    }
  }, [user]);

  const loadReferralData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Load referral code
      const { data: codeData, error: codeError } = await supabase
        .from('referral_codes')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (codeError && codeError.code !== 'PGRST116') throw codeError;
      setReferralCode(codeData);

      // Load stats
      const { data: statsData, error: statsError } = await supabase.rpc('get_user_referral_stats', {
        p_user_id: user.id,
      });

      if (statsError) throw statsError;
      if (statsData && statsData.length > 0) {
        setStats(statsData[0]);
      }

      // Load referrals
      const { data: referralsData, error: referralsError } = await supabase
        .from('referrals')
        .select('*')
        .eq('referrer_user_id', user.id)
        .order('referral_date', { ascending: false });

      if (referralsError) throw referralsError;
      setReferrals(referralsData || []);
    } catch (error) {
      console.error('Failed to load referral data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load referral data.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const copyReferralLink = () => {
    const link = `https://build-desk.com/?ref=${referralCode?.code}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast({
      title: 'Copied!',
      description: 'Referral link copied to clipboard',
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const copyReferralCode = () => {
    navigator.clipboard.writeText(referralCode?.code || '');
    setCopied(true);
    toast({
      title: 'Copied!',
      description: 'Referral code copied to clipboard',
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const shareViaEmail = () => {
    const subject = 'Try BuildDesk - Get $50 Off!';
    const body = `I've been using BuildDesk for construction management and it's been a game-changer. Sign up with my referral code and get $50 off your first month!\n\nReferral link: https://build-desk.com/?ref=${referralCode?.code}\n\nBuildDesk helps you manage projects, track time, and stay profitable. Give it a try!`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const shareOnTwitter = () => {
    const text = `Just discovered @BuildDesk for construction management! Get $50 off with my referral code: ${referralCode?.code}`;
    const url = `https://build-desk.com/?ref=${referralCode?.code}`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
  };

  const shareOnLinkedIn = () => {
    const url = `https://build-desk.com/?ref=${referralCode?.code}`;
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank');
  };

  const getStatusBadge = (status: string) => {
    const config = {
      pending: { color: 'bg-gray-500', label: 'Pending' },
      signed_up: { color: 'bg-blue-500', label: 'Signed Up' },
      trial_active: { color: 'bg-yellow-500', label: 'Trial Active' },
      converted: { color: 'bg-green-500', label: 'Converted' },
      expired: { color: 'bg-red-500', label: 'Expired' },
    };

    const { color, label } = config[status as keyof typeof config] || config.pending;
    return <Badge className={`${color} text-white`}>{label}</Badge>;
  };

  if (loading) {
    return (
      <DashboardLayout title="Referral Program">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Gift className="w-12 h-12 text-construction-orange animate-pulse mx-auto mb-4" />
            <p className="text-muted-foreground">Loading referral program...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!referralCode) {
    return (
      <DashboardLayout title="Referral Program">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Referral code not found. Please contact support.
            </p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  const referralLink = `https://build-desk.com/?ref=${referralCode.code}`;

  return (
    <DashboardLayout title="Referral Program">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-construction-dark">Referral Program</h1>
          <p className="text-muted-foreground">
            Earn ${referralCode.referrer_reward_amount} for every friend who becomes a paying customer
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Referrals</p>
                  <p className="text-2xl font-bold mt-2">{stats?.total_referrals || 0}</p>
                </div>
                <div className="bg-blue-100 p-3 rounded-lg">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Successful</p>
                  <p className="text-2xl font-bold mt-2">{stats?.successful_referrals || 0}</p>
                </div>
                <div className="bg-green-100 p-3 rounded-lg">
                  <Check className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Conversion Rate</p>
                  <p className="text-2xl font-bold mt-2">{stats?.conversion_rate.toFixed(0) || 0}%</p>
                </div>
                <div className="bg-orange-100 p-3 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Earned</p>
                  <p className="text-2xl font-bold mt-2">${stats?.total_rewards_earned.toFixed(0) || 0}</p>
                </div>
                <div className="bg-construction-orange/10 p-3 rounded-lg">
                  <DollarSign className="w-6 h-6 text-construction-orange" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Referral Code Section */}
        <Card>
          <CardHeader>
            <CardTitle>Your Referral Code</CardTitle>
            <CardDescription>
              Share this code with friends and colleagues to earn rewards
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Code Display */}
            <div className="bg-gradient-to-r from-construction-orange/10 to-orange-100 p-6 rounded-lg">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">Your Referral Code</p>
                <div className="flex items-center justify-center gap-2">
                  <p className="text-4xl font-bold text-construction-orange tracking-wider">
                    {referralCode.code}
                  </p>
                  <Button size="icon" variant="ghost" onClick={copyReferralCode}>
                    {copied ? <Check className="w-5 h-5 text-green-600" /> : <Copy className="w-5 h-5" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Used {referralCode.current_uses}{referralCode.max_uses && ` of ${referralCode.max_uses}`} times
                </p>
              </div>
            </div>

            {/* Referral Link */}
            <div>
              <label className="text-sm font-medium">Referral Link</label>
              <div className="flex gap-2 mt-2">
                <Input value={referralLink} readOnly className="flex-1" />
                <Button onClick={copyReferralLink} variant="outline">
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            {/* Share Buttons */}
            <div>
              <label className="text-sm font-medium mb-2 block">Share</label>
              <div className="flex flex-wrap gap-2">
                <Button onClick={shareViaEmail} variant="outline" className="flex-1">
                  <Mail className="w-4 h-4 mr-2" />
                  Email
                </Button>
                <Button onClick={shareOnTwitter} variant="outline" className="flex-1">
                  <Twitter className="w-4 h-4 mr-2" />
                  Twitter
                </Button>
                <Button onClick={shareOnLinkedIn} variant="outline" className="flex-1">
                  <Linkedin className="w-4 h-4 mr-2" />
                  LinkedIn
                </Button>
              </div>
            </div>

            {/* Rewards Info */}
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <Gift className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium text-green-900">How Rewards Work</p>
                  <ul className="text-sm text-green-700 mt-2 space-y-1">
                    <li>• Your friend gets ${referralCode.referee_reward_amount} off their first month</li>
                    <li>• You earn ${referralCode.referrer_reward_amount} credit when they become a paying customer</li>
                    <li>• Credits can be applied to your monthly subscription</li>
                    <li>• No limit on how many people you can refer!</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Referral History */}
        <Card>
          <CardHeader>
            <CardTitle>Your Referrals</CardTitle>
            <CardDescription>
              Track the status of people you've referred
            </CardDescription>
          </CardHeader>
          <CardContent>
            {referrals.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  You haven't referred anyone yet. Start sharing your code to earn rewards!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {referrals.map((referral) => (
                  <div
                    key={referral.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{referral.referee_name || referral.referee_email}</p>
                      <p className="text-sm text-muted-foreground">
                        Referred {new Date(referral.referral_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      {getStatusBadge(referral.status)}
                      {referral.referrer_rewarded && (
                        <Badge className="bg-green-500 text-white">
                          <DollarSign className="w-3 h-3 mr-1" />
                          ${referral.referrer_reward_amount}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ReferralProgram;

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Copy, ExternalLink, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface AffiliateProgram {
  id: string;
  name: string;
  referrer_reward_months: number;
  referee_reward_months: number;
  is_active: boolean;
}

interface AffiliateCode {
  id: string;
  affiliate_code: string;
  total_referrals: number;
  successful_referrals: number;
  total_rewards_earned: number;
  is_active: boolean;
}

const AffiliateCodeGenerator = () => {
  const { user, userProfile } = useAuth();
  const companyId = userProfile?.company_id;
  const [affiliateCode, setAffiliateCode] = useState<AffiliateCode | null>(null);
  const [program, setProgram] = useState<AffiliateProgram | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const baseUrl = window.location.origin;
  const referralUrl = affiliateCode ? `${baseUrl}/?ref=${affiliateCode.affiliate_code}` : '';

  useEffect(() => {
    if (companyId) {
      fetchAffiliateData();
    }
  }, [companyId]);

  const fetchAffiliateData = async () => {
    if (!companyId) return;
    
    setLoading(true);
    try {
      // Fetch active program
      const { data: programData, error: programError } = await supabase
        .from('affiliate_programs')
        .select('*')
        .eq('is_active', true)
        .single();

      if (programError) {
        console.error('Error fetching program:', programError);
      } else {
        setProgram(programData);
      }

      // Fetch company's affiliate code
      const { data: codeData, error: codeError } = await supabase
        .from('affiliate_codes')
        .select('*')
        .eq('company_id', companyId)
        .single();

      if (codeError && codeError.code !== 'PGRST116') {
        console.error('Error fetching affiliate code:', codeError);
      } else if (codeData) {
        setAffiliateCode(codeData);
      }
    } catch (error) {
      console.error('Error fetching affiliate data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateAffiliateCode = async () => {
    if (!companyId) return;
    
    setGenerating(true);
    try {
      const { data, error } = await supabase.rpc('create_company_affiliate_code', {
        p_company_id: companyId
      });

      if (error) throw error;

      // Refresh the affiliate code data
      await fetchAffiliateData();
      
      toast.success("Affiliate code generated successfully!");
    } catch (error) {
      console.error('Error generating affiliate code:', error);
      toast.error("Failed to generate affiliate code");
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard!");
    } catch (error) {
      toast.error("Failed to copy to clipboard");
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Affiliate Program</CardTitle>
          <CardDescription>Loading your referral information...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <RefreshCw className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Program Information */}
      {program && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Referral Program
              <Badge variant="secondary">{program.name}</Badge>
            </CardTitle>
            <CardDescription>
              Earn rewards by referring other businesses to our platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {program.referrer_reward_months > 0 && (
                <div className="p-4 bg-primary/5 rounded-lg">
                  <h4 className="font-medium text-primary">You Get</h4>
                  <p className="text-2xl font-bold">{program.referrer_reward_months} Month{program.referrer_reward_months !== 1 ? 's' : ''} Free</p>
                  <p className="text-sm text-muted-foreground">For each successful referral</p>
                </div>
              )}
              {program.referee_reward_months > 0 && (
                <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                  <h4 className="font-medium text-green-700 dark:text-green-400">They Get</h4>
                  <p className="text-2xl font-bold text-green-800 dark:text-green-300">{program.referee_reward_months} Month{program.referee_reward_months !== 1 ? 's' : ''} Free</p>
                  <p className="text-sm text-green-600 dark:text-green-500">When they subscribe</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Affiliate Code Generator */}
      <Card>
        <CardHeader>
          <CardTitle>Your Referral Link</CardTitle>
          <CardDescription>
            Share this link to track referrals and earn rewards
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!affiliateCode ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                You don't have a referral code yet. Generate one to start earning rewards!
              </p>
              <Button 
                onClick={generateAffiliateCode} 
                disabled={generating}
                className="gap-2"
              >
                {generating && <RefreshCw className="h-4 w-4 animate-spin" />}
                Generate Referral Code
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">Your Referral Code</label>
                <div className="flex gap-2">
                  <Input 
                    value={affiliateCode.affiliate_code} 
                    readOnly 
                    className="font-mono"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(affiliateCode.affiliate_code)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Your Referral Link</label>
                <div className="flex gap-2">
                  <Input 
                    value={referralUrl} 
                    readOnly 
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(referralUrl)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => window.open(referralUrl, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 pt-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{affiliateCode.total_referrals}</div>
                  <div className="text-sm text-muted-foreground">Total Clicks</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{affiliateCode.successful_referrals}</div>
                  <div className="text-sm text-muted-foreground">Successful Referrals</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{affiliateCode.total_rewards_earned}</div>
                  <div className="text-sm text-muted-foreground">Months Earned</div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AffiliateCodeGenerator;
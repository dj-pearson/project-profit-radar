import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, Sparkles, ArrowRight, Calendar, DollarSign, Shield, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const CheckoutSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [subscriptionDetails, setSubscriptionDetails] = useState<any>(null);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      // No session ID, redirect to pricing
      navigate('/pricing');
      return;
    }

    if (!user) {
      // Wait for auth to load
      const timer = setTimeout(() => {
        if (!user) {
          navigate('/auth');
        }
      }, 2000);
      return () => clearTimeout(timer);
    }

    // Fetch subscription details from Supabase
    const fetchSubscription = async () => {
      try {
        const { data, error } = await supabase
          .from('subscribers')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error('Error fetching subscription:', error);
        } else {
          setSubscriptionDetails(data);
        }
      } catch (error) {
        console.error('Subscription fetch error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSubscription();
  }, [searchParams, user, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-construction-blue/5 via-white to-construction-orange/5">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-construction-orange mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your subscription details...</p>
        </div>
      </div>
    );
  }

  const trialEndDate = new Date();
  trialEndDate.setDate(trialEndDate.getDate() + 14);

  const planName = subscriptionDetails?.subscription_tier
    ? subscriptionDetails.subscription_tier.charAt(0).toUpperCase() + subscriptionDetails.subscription_tier.slice(1)
    : 'Professional';

  return (
    <div className="min-h-screen bg-gradient-to-br from-construction-blue/5 via-white to-construction-orange/5 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Success Animation */}
        <div className="text-center mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4 animate-in zoom-in duration-500 delay-200">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-construction-dark mb-2">
            Welcome to BuildDesk!
          </h1>
          <p className="text-xl text-muted-foreground">
            Your {planName} trial is now active
          </p>
        </div>

        {/* Trial Summary Card */}
        <Card className="mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
          <CardContent className="pt-6">
            <div className="grid grid-cols-3 gap-4 text-center mb-4">
              <div>
                <div className="text-3xl font-bold text-construction-blue mb-1">14</div>
                <div className="text-sm text-muted-foreground">Days Free Trial</div>
              </div>
              <div>
                <div className="text-lg font-bold text-construction-blue mb-1">
                  {trialEndDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
                <div className="text-sm text-muted-foreground">Trial Ends</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-construction-blue mb-1">$0</div>
                <div className="text-sm text-muted-foreground">Charged Today</div>
              </div>
            </div>

            <Alert className="border-blue-500 bg-blue-50">
              <Shield className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-900">
                <strong>Your trial starts now!</strong>
                <p className="text-sm mt-1">
                  Your card will only be charged after your 14-day trial ends on {trialEndDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.
                  Cancel anytime before then with no charge.
                </p>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* What's Included */}
        <Card className="mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-500">
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-construction-orange" />
              What's Included in Your {planName} Trial
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span className="text-sm">Unlimited projects & users</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span className="text-sm">Real-time job costing</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span className="text-sm">Mobile time tracking</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span className="text-sm">QuickBooks integration</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span className="text-sm">OSHA compliance tools</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span className="text-sm">Priority support</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Next Steps Card */}
        <Card className="mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-700">
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold mb-4">Get Started in 3 Steps:</h3>
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-between group hover:border-construction-orange hover:bg-construction-orange/5"
                asChild
              >
                <Link to="/create-project">
                  <span className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-construction-orange/10 text-construction-orange text-sm font-semibold">1</span>
                    <span>Create Your First Project</span>
                  </span>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button
                variant="outline"
                className="w-full justify-between group hover:border-construction-orange hover:bg-construction-orange/5"
                asChild
              >
                <Link to="/people-hub">
                  <span className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-construction-orange/10 text-construction-orange text-sm font-semibold">2</span>
                    <span>Invite Your Team Members</span>
                  </span>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button
                variant="outline"
                className="w-full justify-between group hover:border-construction-orange hover:bg-construction-orange/5"
                asChild
              >
                <Link to="/dashboard">
                  <span className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-construction-orange/10 text-construction-orange text-sm font-semibold">3</span>
                    <span>Explore Your Dashboard</span>
                  </span>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Main CTA */}
        <Button
          className="w-full bg-construction-orange hover:bg-construction-orange/90 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-1000"
          size="lg"
          onClick={() => navigate('/dashboard')}
        >
          Go to Dashboard
        </Button>

        {/* Support */}
        <p className="text-center text-sm text-muted-foreground mt-6 animate-in fade-in duration-700 delay-1000">
          Questions? Contact us at <a href="mailto:support@builddesk.com" className="text-construction-blue hover:text-construction-orange">support@builddesk.com</a> or use the chat in your dashboard.
        </p>
      </div>
    </div>
  );
};

export default CheckoutSuccess;

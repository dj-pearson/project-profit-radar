import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import SubscriptionManager from "@/components/SubscriptionManager";
import TrialStatusBanner from "@/components/TrialStatusBanner";
import UsageDashboard from "@/components/billing/UsageDashboard";
import PaymentFailureAlert from "@/components/billing/PaymentFailureAlert";
import { ResponsiveContainer } from '@/components/layout/ResponsiveContainer';
import { mobileTextClasses } from '@/utils/mobileHelpers';

const SubscriptionSettings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate("/auth");
    }
  }, [user, navigate]);

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <ResponsiveContainer>
        <div className="py-4 sm:py-8">
          <TrialStatusBanner />
          
          <div className="mb-6 sm:mb-8">
            <h1 className={mobileTextClasses.title}>Subscription</h1>
            <p className={mobileTextClasses.muted}>Manage your subscription and billing information.</p>
          </div>

          <div className="space-y-4 sm:space-y-6">
            <PaymentFailureAlert />
            
            <div className="max-w-2xl">
              <SubscriptionManager />
            </div>

            <UsageDashboard />
          </div>
        </div>
      </ResponsiveContainer>
    </div>
  );
};

export default SubscriptionSettings;
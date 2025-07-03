import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import SubscriptionManager from "@/components/SubscriptionManager";
import TrialStatusBanner from "@/components/TrialStatusBanner";
import UsageDashboard from "@/components/billing/UsageDashboard";
import PaymentFailureAlert from "@/components/billing/PaymentFailureAlert";

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
      <div className="container mx-auto px-4 py-8">
        <TrialStatusBanner />
        
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-construction-dark mb-2">Subscription</h1>
          <p className="text-muted-foreground">Manage your subscription and billing information.</p>
        </div>

        <div className="space-y-6">
          <PaymentFailureAlert />
          
          <div className="max-w-2xl">
            <SubscriptionManager />
          </div>

          <UsageDashboard />
        </div>
      </div>
    </div>
  );
};

export default SubscriptionSettings;
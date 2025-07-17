import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import SubscriptionManager from "@/components/SubscriptionManager";
import TrialStatusBanner from "@/components/TrialStatusBanner";
import UsageDashboard from "@/components/billing/UsageDashboard";
import PaymentFailureAlert from "@/components/billing/PaymentFailureAlert";
import AffiliateCodeGenerator from "@/components/affiliate/AffiliateCodeGenerator";
import AffiliateManagement from "@/components/affiliate/AffiliateManagement";
import { ResponsiveContainer } from '@/components/layout/ResponsiveContainer';
import { mobileTextClasses } from '@/utils/mobileHelpers';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const SubscriptionSettings = () => {
  const { user, userProfile } = useAuth();
  const userRole = userProfile?.role;
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("subscription");

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
            <h1 className={mobileTextClasses.title}>Subscription & Referrals</h1>
            <p className={mobileTextClasses.muted}>Manage your subscription, billing, and referral program.</p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="subscription">Subscription</TabsTrigger>
              <TabsTrigger value="referrals">Referrals</TabsTrigger>
              {userRole === 'root_admin' && (
                <TabsTrigger value="management">Management</TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="subscription" className="space-y-4 sm:space-y-6">
              <PaymentFailureAlert />
              
              <div className="max-w-2xl">
                <SubscriptionManager />
              </div>

              <UsageDashboard />
            </TabsContent>

            <TabsContent value="referrals" className="space-y-4 sm:space-y-6">
              <AffiliateCodeGenerator />
            </TabsContent>

            {userRole === 'root_admin' && (
              <TabsContent value="management" className="space-y-4 sm:space-y-6">
                <AffiliateManagement />
              </TabsContent>
            )}
          </Tabs>
        </div>
      </ResponsiveContainer>
    </div>
  );
};

export default SubscriptionSettings;
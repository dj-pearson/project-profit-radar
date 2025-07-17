import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import SubscriptionManager from "@/components/SubscriptionManager";
import TrialStatusBanner from "@/components/TrialStatusBanner";
import UsageDashboard from "@/components/billing/UsageDashboard";
import PaymentFailureAlert from "@/components/billing/PaymentFailureAlert";
import AffiliateCodeGenerator from "@/components/affiliate/AffiliateCodeGenerator";
import AffiliateManagement from "@/components/affiliate/AffiliateManagement";
import { mobileTextClasses } from '@/utils/mobileHelpers';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SidebarProvider } from "@/components/ui/sidebar";
import { SimplifiedSidebar } from "@/components/navigation/SimplifiedSidebar";

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
    <SidebarProvider>
      <div className="flex w-full min-h-screen bg-background">
        <SimplifiedSidebar />
        <div className="flex-1">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6">
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
        </div>
      </div>
    </SidebarProvider>
  );
};

export default SubscriptionSettings;
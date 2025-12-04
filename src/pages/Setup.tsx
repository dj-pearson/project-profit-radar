import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { MobilePageWrapper, MobileStatsGrid, MobileFilters, mobileGridClasses, mobileFilterClasses, mobileButtonClasses } from '@/utils/mobileHelpers';

const Setup = () => {
  const { user, userProfile, refreshProfile, loading, siteId } = useAuth();
  const navigate = useNavigate();
  const [setupLoading, setSetupLoading] = useState(false);
  const [step, setStep] = useState(1);
  
  // Company setup state
  const [companyName, setCompanyName] = useState('');
  const [address, setAddress] = useState('');
  const [industryType, setIndustryType] = useState('');
  const [companySize, setCompanySize] = useState('');
  const [annualRevenue, setAnnualRevenue] = useState('');
  const [licenseNumbers, setLicenseNumbers] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
    
    // If user already has a company, redirect to dashboard
    if (userProfile?.company_id) {
      navigate('/dashboard');
    }
  }, [user, userProfile, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-construction-blue mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const handleCompanySetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSetupLoading(true);

      try {
        // Validate siteId is available (required for multi-tenant isolation)
        if (!siteId) {
          toast({
            variant: "destructive",
            title: "Configuration Error",
            description: "Unable to determine site. Please refresh the page and try again."
          });
          setSetupLoading(false);
          return;
        }

        // DEBUG: Log authentication state
        console.log('🔍 Setup Debug - Start:', {
          timestamp: new Date().toISOString(),
          user: user?.id,
          userEmail: user?.email,
          userProfile: userProfile?.id,
          userRole: userProfile?.role,
          siteId,
          hasSession: !!user,
          supabaseUrl: import.meta.env.VITE_SUPABASE_URL
        });

        // DEBUG: Check current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        console.log('🔍 Setup Debug - Session Check:', {
          hasSession: !!session,
          sessionError,
          accessToken: session?.access_token ? 'exists' : 'missing',
          accessTokenPreview: session?.access_token ? session.access_token.substring(0, 50) + '...' : 'none',
          user: session?.user?.id,
          userRole: session?.user?.role,
          userEmail: session?.user?.email
        });

        if (!session || sessionError) {
          console.error('❌ No valid session!', sessionError);
          toast({
            variant: "destructive",
            title: "Authentication Error",
            description: "Your session has expired. Please log in again."
          });
          setSetupLoading(false);
          return;
        }

        // DEBUG: Log insert payload
        const insertPayload = {
          name: companyName,
          address,
          industry_type: industryType as 'residential' | 'commercial' | 'civil_infrastructure' | 'specialty_trades',
          company_size: companySize,
          annual_revenue_range: annualRevenue,
          license_numbers: licenseNumbers ? licenseNumbers.split(',').map(l => l.trim()) : null,
          site_id: siteId,
          tenant_id: userProfile?.tenant_id || null,
        };
        console.log('🔍 Setup Debug - Insert Payload:', insertPayload);
        
        // DEBUG: Check what Supabase client will send
        const { data: authData } = await supabase.auth.getUser();
        console.log('🔍 Setup Debug - Auth User Check:', {
          userId: authData?.user?.id,
          userEmail: authData?.user?.email,
          userRole: authData?.user?.role
        });

        // Create company scoped to current site/tenant
        const { data: company, error: companyError } = await supabase
          .from('companies')
          .insert([insertPayload])
          .select()
          .single();

        console.log('🔍 Setup Debug - Insert Result:', { company, companyError });

        if (companyError) {
          console.error('❌ Company Insert Error:', {
            message: companyError.message,
            code: companyError.code,
            details: companyError.details,
            hint: companyError.hint
          });
          throw companyError;
        }

        // Update user profile with company_id and ensure site_id is set
        const { error: profileError } = await supabase
          .from('user_profiles')
          .update({
            company_id: company.id,
            site_id: siteId,
            tenant_id: userProfile?.tenant_id || null,
          })
          .eq('id', user.id);

      if (profileError) throw profileError;

      // Create default cost codes for the company
      const defaultCostCodes = [
        { code: '01-001', name: 'General Conditions', category: 'General', description: 'Project management and general conditions' },
        { code: '03-001', name: 'Concrete', category: 'Concrete', description: 'Concrete work and materials' },
        { code: '04-001', name: 'Masonry', category: 'Masonry', description: 'Masonry work and materials' },
        { code: '05-001', name: 'Metals', category: 'Metals', description: 'Structural and miscellaneous metals' },
        { code: '06-001', name: 'Wood & Plastics', category: 'Wood', description: 'Rough and finish carpentry' },
        { code: '07-001', name: 'Thermal & Moisture', category: 'Insulation', description: 'Insulation and waterproofing' },
        { code: '08-001', name: 'Openings', category: 'Doors & Windows', description: 'Doors, windows, and hardware' },
        { code: '09-001', name: 'Finishes', category: 'Finishes', description: 'Flooring, wall finishes, and painting' },
        { code: '15-001', name: 'Mechanical', category: 'HVAC', description: 'HVAC and plumbing systems' },
        { code: '16-001', name: 'Electrical', category: 'Electrical', description: 'Electrical systems and lighting' },
      ];

      const costCodesWithCompanyId = defaultCostCodes.map(code => ({
        ...code,
        company_id: company.id
      }));

      const { error: costCodesError } = await supabase
        .from('cost_codes')
        .insert(costCodesWithCompanyId);

      if (costCodesError) {
        console.warn('Could not create default cost codes:', costCodesError);
      }

      await refreshProfile();

      toast({
        title: "Company Setup Complete!",
        description: "Your company has been created successfully."
      });

      navigate('/dashboard');

    } catch (error: any) {
      console.error('Setup error:', error);
      toast({
        variant: "destructive",
        title: "Setup Failed",
        description: error.message || "Failed to complete company setup"
      });
    } finally {
      setSetupLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-construction-blue">Welcome to Build Desk</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-2">Let's set up your company to get started</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">Company Information</CardTitle>
            <CardDescription className="text-sm sm:text-base">
              Tell us about your construction business to customize your experience
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCompanySetup} className="space-y-6">
              <div className={mobileFilterClasses.container}>
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name *</Label>
                  <Input
                    id="companyName"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="ABC Construction LLC"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="industryType">Industry Type *</Label>
                  <Select value={industryType} onValueChange={setIndustryType} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select industry type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="residential">Residential</SelectItem>
                      <SelectItem value="commercial">Commercial</SelectItem>
                      <SelectItem value="civil_infrastructure">Civil/Infrastructure</SelectItem>
                      <SelectItem value="specialty_trades">Specialty Trades</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Business Address</Label>
                <Input
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="123 Main St, City, State, ZIP"
                />
              </div>

              <div className={mobileFilterClasses.container}>
                <div className="space-y-2">
                  <Label htmlFor="companySize">Company Size</Label>
                  <Select value={companySize} onValueChange={setCompanySize}>
                    <SelectTrigger>
                      <SelectValue placeholder="Number of employees" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1-10">1-10 employees</SelectItem>
                      <SelectItem value="11-50">11-50 employees</SelectItem>
                      <SelectItem value="51-100">51-100 employees</SelectItem>
                      <SelectItem value="100+">100+ employees</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="annualRevenue">Annual Revenue Range</Label>
                  <Select value={annualRevenue} onValueChange={setAnnualRevenue}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select revenue range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="<$1M">Less than $1M</SelectItem>
                      <SelectItem value="$1M-$5M">$1M - $5M</SelectItem>
                      <SelectItem value="$5M-$10M">$5M - $10M</SelectItem>
                      <SelectItem value="$10M-$50M">$10M - $50M</SelectItem>
                      <SelectItem value="$50M+">$50M+</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="licenseNumbers">License Numbers</Label>
                <Input
                  id="licenseNumbers"
                  value={licenseNumbers}
                  onChange={(e) => setLicenseNumbers(e.target.value)}
                  placeholder="License numbers (comma-separated)"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full text-sm sm:text-base py-2 sm:py-3" 
                disabled={setupLoading || !companyName || !industryType}
              >
                {setupLoading ? 'Setting Up Company...' : 'Complete Setup'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Setup;
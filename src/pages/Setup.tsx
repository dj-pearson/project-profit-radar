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
import { logger } from '@/lib/logger';

const Setup = () => {
  const { user, userProfile, refreshProfile, loading } = useAuth();
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

  // Clear OAuth hash params to prevent redirect issues
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && (hash.includes('access_token=') || hash.includes('refresh_token='))) {
      logger.debug('Clearing OAuth callback hash from URL (Setup)');
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }, []);

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
        // Refresh session before API calls to ensure valid token
        await supabase.auth.refreshSession();

        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (!session || sessionError) {
          logger.error('No valid session for company setup', sessionError);
          toast({
            variant: "destructive",
            title: "Authentication Error",
            description: "Your session has expired. Please log in again."
          });
          setSetupLoading(false);
          return;
        }

        const insertPayload = {
          name: companyName,
          address,
          industry_type: industryType as 'residential' | 'commercial' | 'civil_infrastructure' | 'specialty_trades',
          company_size: companySize,
          annual_revenue_range: annualRevenue,
          license_numbers: licenseNumbers ? licenseNumbers.split(',').map(l => l.trim()) : null,
          tenant_id: userProfile?.tenant_id || null,
        };

        // Create company scoped to current site/tenant
        const { data: company, error: companyError } = await supabase
          .from('companies')
          .insert([insertPayload])
          .select()
          .single();

        if (companyError) {
          logger.error('Company insert failed', companyError, {
            code: companyError.code,
            details: companyError.details,
          });
          throw companyError;
        }

        // Update user profile with company_id
        const { error: profileError } = await supabase
          .from('user_profiles')
          .update({
            company_id: company.id,
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
        logger.warn('Could not create default cost codes', costCodesError);
      }

      await refreshProfile();

      toast({
        title: "Company Setup Complete!",
        description: "Your company has been created successfully."
      });

      navigate('/dashboard');

    } catch (error: any) {
      logger.error('Setup error', error);
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
    <main className="min-h-screen bg-background flex items-center justify-center p-4" role="main" aria-label="Company Setup">
      <div className="w-full max-w-4xl">
        <header className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-construction-blue">Welcome to Build Desk</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-2">Let's set up your company to get started</p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">Company Information</CardTitle>
            <CardDescription className="text-sm sm:text-base">
              Tell us about your construction business to customize your experience
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCompanySetup} className="space-y-6" aria-label="Company setup form">
              <div className={mobileFilterClasses.container}>
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name *</Label>
                  <Input
                    id="companyName"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="ABC Construction LLC"
                    required
                    aria-required="true"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="industryType">Industry Type *</Label>
                  <Select value={industryType} onValueChange={setIndustryType} required>
                    <SelectTrigger aria-required="true" aria-label="Select industry type">
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
                    <SelectTrigger aria-label="Select company size">
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
                    <SelectTrigger aria-label="Select annual revenue range">
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
                  aria-describedby="license-hint"
                />
                <p id="license-hint" className="text-xs text-muted-foreground">
                  Enter multiple license numbers separated by commas
                </p>
              </div>

              <Button
                type="submit"
                className="w-full text-sm sm:text-base py-2 sm:py-3"
                disabled={setupLoading || !companyName || !industryType}
                aria-busy={setupLoading}
              >
                {setupLoading ? 'Setting Up Company...' : 'Complete Setup'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default Setup;
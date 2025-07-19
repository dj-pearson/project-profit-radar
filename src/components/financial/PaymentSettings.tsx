import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  CreditCard, 
  Shield, 
  AlertTriangle, 
  Info,
  Lock,
  DollarSign
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface PaymentSettings {
  id?: string;
  processor_type: 'pearson_stripe' | 'own_stripe';
  processing_fee_percentage: number;
  per_transaction_fee: number;
  chargeback_fee: number;
  stripe_publishable_key?: string;
  is_active: boolean;
}

export const PaymentSettings = () => {
  const [settings, setSettings] = useState<PaymentSettings>({
    processor_type: 'pearson_stripe',
    processing_fee_percentage: 1.0, // Updated to 1% as requested
    per_transaction_fee: 0.50, // Updated to $0.50 as requested
    chargeback_fee: 15.00,
    is_active: true
  });
  const [stripeKeys, setStripeKeys] = useState({
    publishable_key: '',
    secret_key: '',
    webhook_secret: ''
  });
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const { userProfile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    loadPaymentSettings();
  }, [userProfile?.company_id]);

  const loadPaymentSettings = async () => {
    if (!userProfile?.company_id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('company_payment_settings')
        .select('*')
        .eq('company_id', userProfile.company_id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings({
          id: data.id,
          processor_type: data.processor_type as 'pearson_stripe' | 'own_stripe',
          processing_fee_percentage: data.processing_fee_percentage || 3.5,
          per_transaction_fee: data.per_transaction_fee || 0.50,
          chargeback_fee: data.chargeback_fee || 15.00,
          stripe_publishable_key: data.stripe_publishable_key,
          is_active: data.is_active
        });

        if (data.stripe_publishable_key) {
          setStripeKeys(prev => ({
            ...prev,
            publishable_key: data.stripe_publishable_key
          }));
        }
      }
    } catch (error) {
      console.error('Error loading payment settings:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load payment settings"
      });
    } finally {
      setLoading(false);
    }
  };

  const savePaymentSettings = async () => {
    if (!userProfile?.company_id) return;

    try {
      setSaveLoading(true);

      // If using own Stripe, validate keys are provided
      if (settings.processor_type === 'own_stripe') {
        if (!stripeKeys.publishable_key || !stripeKeys.secret_key) {
          toast({
            variant: "destructive",
            title: "Missing Keys",
            description: "Please provide both publishable and secret keys for your Stripe account"
          });
          return;
        }
      }

      const settingsData = {
        company_id: userProfile.company_id,
        processor_type: settings.processor_type,
        processing_fee_percentage: settings.processing_fee_percentage,
        per_transaction_fee: settings.per_transaction_fee,
        chargeback_fee: settings.chargeback_fee,
        stripe_publishable_key: settings.processor_type === 'own_stripe' ? stripeKeys.publishable_key : null,
        configured_by: userProfile.id,
        is_active: true
      };

      if (settings.id) {
        const { error } = await supabase
          .from('company_payment_settings')
          .update(settingsData)
          .eq('id', settings.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('company_payment_settings')
          .insert(settingsData)
          .select()
          .single();
        if (error) throw error;
        setSettings(prev => ({ ...prev, id: data.id }));
      }

      // If using own Stripe, securely store the secret key
      if (settings.processor_type === 'own_stripe' && stripeKeys.secret_key) {
        const { error: keyError } = await supabase.functions.invoke('store-stripe-keys', {
          body: {
            company_id: userProfile.company_id,
            secret_key: stripeKeys.secret_key,
            webhook_secret: stripeKeys.webhook_secret
          }
        });

        if (keyError) {
          console.error('Error storing Stripe keys:', keyError);
          toast({
            variant: "destructive",
            title: "Warning",
            description: "Settings saved but failed to securely store Stripe keys. Please try again."
          });
          return;
        }
      }

      toast({
        title: "Settings Saved",
        description: "Payment processor settings have been updated successfully"
      });

    } catch (error) {
      console.error('Error saving payment settings:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save payment settings"
      });
    } finally {
      setSaveLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Processing Setup
          </CardTitle>
          <CardDescription>
            Choose how your company processes invoice payments from clients. Start with our platform processing (1% + $0.50 per transaction) for easy setup, or connect your own Stripe account for direct processing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <RadioGroup
              value={settings.processor_type}
              onValueChange={(value: 'pearson_stripe' | 'own_stripe') => 
                setSettings(prev => ({ ...prev, processor_type: value }))
              }
            >
              {/* Pearson Stripe Option */}
              <div className="flex items-start space-x-3 space-y-0 p-4 border rounded-lg">
                <RadioGroupItem value="pearson_stripe" id="pearson_stripe" className="mt-1" />
                <div className="flex-1 space-y-2">
                  <Label htmlFor="pearson_stripe" className="text-base font-medium">
                    Use Pearson Media Payment Processing
                  </Label>
                  <Badge variant="secondary" className="text-xs">Recommended</Badge>
                  <p className="text-sm text-muted-foreground">
                    Process payments through our secure Stripe account. Simple setup with no technical configuration required.
                  </p>
                  
                  <div className="mt-4 space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span>Processing Fee:</span>
                      <span className="font-medium">{settings.processing_fee_percentage}% + ${settings.per_transaction_fee}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Chargeback Fee:</span>
                      <span className="font-medium">${settings.chargeback_fee}</span>
                    </div>
                  </div>

                  <Alert className="mt-4">
                    <Info className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      <strong>Payment Terms:</strong> All transactions processed through Pearson Media's Stripe account. 
                      Receipts will show "Pearson Media - Project Services" as the merchant. 
                      Chargebacks will be charged to your account at ${settings.chargeback_fee} plus any fees imposed by the payment processor.
                    </AlertDescription>
                  </Alert>
                </div>
              </div>

              {/* Own Stripe Option */}
              <div className="flex items-start space-x-3 space-y-0 p-4 border rounded-lg">
                <RadioGroupItem value="own_stripe" id="own_stripe" className="mt-1" />
                <div className="flex-1 space-y-2">
                  <Label htmlFor="own_stripe" className="text-base font-medium">
                    Use Your Own Stripe Account
                  </Label>
                  <Badge variant="outline" className="text-xs">Advanced</Badge>
                  <p className="text-sm text-muted-foreground">
                    Connect your own Stripe account for direct payment processing. Requires Stripe account setup and API keys.
                  </p>

                  {settings.processor_type === 'own_stripe' && (
                    <div className="mt-4 space-y-4">
                      <div>
                        <Label htmlFor="publishable-key">Stripe Publishable Key</Label>
                        <Input
                          id="publishable-key"
                          type="text"
                          value={stripeKeys.publishable_key}
                          onChange={(e) => setStripeKeys(prev => ({ ...prev, publishable_key: e.target.value }))}
                          placeholder="pk_live_..."
                        />
                      </div>
                      <div>
                        <Label htmlFor="secret-key">Stripe Secret Key</Label>
                        <Input
                          id="secret-key"
                          type="password"
                          value={stripeKeys.secret_key}
                          onChange={(e) => setStripeKeys(prev => ({ ...prev, secret_key: e.target.value }))}
                          placeholder="sk_live_..."
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          <Lock className="h-3 w-3 inline mr-1" />
                          Stored securely and encrypted
                        </p>
                      </div>
                      <div>
                        <Label htmlFor="webhook-secret">Webhook Secret (Optional)</Label>
                        <Input
                          id="webhook-secret"
                          type="password"
                          value={stripeKeys.webhook_secret}
                          onChange={(e) => setStripeKeys(prev => ({ ...prev, webhook_secret: e.target.value }))}
                          placeholder="whsec_..."
                        />
                      </div>

                      <Alert>
                        <Shield className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                          Your API keys are encrypted and stored securely. Only your company can access them.
                        </AlertDescription>
                      </Alert>
                    </div>
                  )}
                </div>
              </div>
            </RadioGroup>

            <Separator />

            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Current Status: 
                  <Badge variant={settings.is_active ? "default" : "secondary"} className="ml-2">
                    {settings.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </span>
              </div>
              <Button onClick={savePaymentSettings} disabled={saveLoading}>
                {saveLoading ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {settings.processor_type === 'pearson_stripe' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Important Terms & Conditions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">Chargeback Policy</h4>
              <p className="text-muted-foreground">
                In the event of a chargeback on any transaction processed through Pearson Media's Stripe account, 
                your company will be charged a ${settings.chargeback_fee} administrative fee plus any additional fees 
                imposed by Stripe or the card issuer. This charge will be automatically billed to your account.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Receipt Information</h4>
              <p className="text-muted-foreground">
                All client receipts will display "Pearson Media - Project Services" as the merchant name. 
                This is necessary as payments are processed through our Stripe account.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Processing Timeline</h4>
              <p className="text-muted-foreground">
                Funds are typically available in 2-7 business days after successful payment, subject to Stripe's 
                standard payout schedule and any holds for new accounts.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
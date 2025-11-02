import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, User, Building2, Phone, Mail, Clock, CheckCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DemoRequestFormProps {
  onSuccess?: () => void;
  compactMode?: boolean;
}

export const DemoRequestForm = ({ onSuccess, compactMode = false }: DemoRequestFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    companyName: '',
    companySize: '',
    industry: '',
    demoType: 'standard',
    preferredDate: '',
    preferredTime: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York',
    message: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Get UTM parameters from URL
      const urlParams = new URLSearchParams(window.location.search);
      const utm_source = urlParams.get('utm_source');
      const utm_medium = urlParams.get('utm_medium');
      const utm_campaign = urlParams.get('utm_campaign');

      const { data, error } = await supabase.functions.invoke('handle-demo-request', {
        body: {
          ...formData,
          utm_source,
          utm_medium,
          utm_campaign
        }
      });

      if (error) throw error;

      if (data?.success) {
        setIsSuccess(true);
        toast({
          title: "Demo Request Received!",
          description: "Our team will contact you within 24 hours to schedule your personalized demo.",
        });

        // Reset form
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          companyName: '',
          companySize: '',
          industry: '',
          demoType: 'standard',
          preferredDate: '',
          preferredTime: '',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York',
          message: ''
        });

        // Call success callback
        if (onSuccess) {
          setTimeout(onSuccess, 2000);
        }
      }
    } catch (error) {
      console.error('Demo request error:', error);
      toast({
        title: "Request Failed",
        description: error.message || "Failed to submit demo request. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess && !compactMode) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="rounded-full bg-green-100 p-3">
                <CheckCircle className="h-12 w-12 text-green-600" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-construction-dark">Request Received!</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Thank you for your interest in BuildDesk. A member of our team will reach out within 24 hours to schedule your personalized demo.
            </p>
            <div className="pt-4">
              <p className="text-sm text-muted-foreground">
                Check your email for confirmation and next steps.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={compactMode ? '' : 'max-w-2xl mx-auto'}>
      {!compactMode && (
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-construction-orange" />
            Request a Personalized Demo
          </CardTitle>
          <CardDescription>
            See BuildDesk in action. Our construction experts will walk you through the platform and answer your questions.
          </CardDescription>
        </CardHeader>
      )}

      <CardContent className={compactMode ? 'p-4' : ''}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Contact Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="firstName"
                  placeholder="John"
                  className="pl-10"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                placeholder="Smith"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Work Email *</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="john@company.com"
                className="pl-10"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="phone"
                type="tel"
                placeholder="(555) 123-4567"
                className="pl-10"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
          </div>

          {/* Company Information */}
          <div className="space-y-2">
            <Label htmlFor="companyName">Company Name *</Label>
            <div className="relative">
              <Building2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="companyName"
                placeholder="Your Construction Company"
                className="pl-10"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="companySize">Company Size</Label>
              <Select
                value={formData.companySize}
                onValueChange={(value) => setFormData({ ...formData, companySize: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1-10">1-10 employees</SelectItem>
                  <SelectItem value="11-50">11-50 employees</SelectItem>
                  <SelectItem value="51-200">51-200 employees</SelectItem>
                  <SelectItem value="201-500">201-500 employees</SelectItem>
                  <SelectItem value="500+">500+ employees</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="industry">Industry Type</Label>
              <Select
                value={formData.industry}
                onValueChange={(value) => setFormData({ ...formData, industry: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select industry" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="residential">Residential Construction</SelectItem>
                  <SelectItem value="commercial">Commercial Construction</SelectItem>
                  <SelectItem value="industrial">Industrial Construction</SelectItem>
                  <SelectItem value="specialty_trades">Specialty Trades</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Demo Preferences */}
          <div className="space-y-2">
            <Label htmlFor="demoType">Demo Type</Label>
            <Select
              value={formData.demoType}
              onValueChange={(value) => setFormData({ ...formData, demoType: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="quick_15min">Quick Overview (15 min)</SelectItem>
                <SelectItem value="standard">Standard Demo (30 min)</SelectItem>
                <SelectItem value="full_60min">In-Depth Walkthrough (60 min)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="preferredDate">Preferred Date (Optional)</Label>
              <Input
                id="preferredDate"
                type="date"
                min={new Date().toISOString().split('T')[0]}
                value={formData.preferredDate}
                onChange={(e) => setFormData({ ...formData, preferredDate: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="preferredTime">Preferred Time (Optional)</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Select
                  value={formData.preferredTime}
                  onValueChange={(value) => setFormData({ ...formData, preferredTime: value })}
                >
                  <SelectTrigger className="pl-10">
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="morning">Morning (9am - 12pm)</SelectItem>
                    <SelectItem value="afternoon">Afternoon (12pm - 5pm)</SelectItem>
                    <SelectItem value="evening">Evening (5pm - 7pm)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">What would you like to see? (Optional)</Label>
            <Textarea
              id="message"
              placeholder="Tell us about your specific needs or what features you're most interested in..."
              rows={4}
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            />
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-construction-orange hover:bg-construction-orange/90"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Submitting Request...
              </>
            ) : (
              <>
                <Calendar className="mr-2 h-5 w-5" />
                Request Demo
              </>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            By submitting this form, you agree to be contacted by our team. We respect your privacy and will never share your information.
          </p>
        </form>
      </CardContent>
    </Card>
  );
};

export default DemoRequestForm;

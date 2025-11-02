import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, Building2, Phone, Mail, MessageSquare, CheckCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ContactSalesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ContactSalesModal = ({ isOpen, onClose }: ContactSalesModalProps) => {
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
    inquiryType: 'general',
    message: '',
    estimatedBudget: '',
    timeline: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Get UTM parameters
      const urlParams = new URLSearchParams(window.location.search);
      const utm_source = urlParams.get('utm_source');
      const utm_medium = urlParams.get('utm_medium');
      const utm_campaign = urlParams.get('utm_campaign');

      const { data, error } = await supabase.functions.invoke('handle-sales-contact', {
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
          title: "Message Sent!",
          description: "Our sales team will reach out within 24 hours.",
        });

        // Reset form and close after delay
        setTimeout(() => {
          setFormData({
            firstName: '',
            lastName: '',
            email: '',
            phone: '',
            companyName: '',
            companySize: '',
            industry: '',
            inquiryType: 'general',
            message: '',
            estimatedBudget: '',
            timeline: ''
          });
          setIsSuccess(false);
          onClose();
        }, 3000);
      }
    } catch (error) {
      console.error('Contact sales error:', error);
      toast({
        title: "Request Failed",
        description: error.message || "Failed to send message. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {isSuccess ? (
          <div className="py-8 text-center space-y-4">
            <div className="flex justify-center">
              <div className="rounded-full bg-green-100 p-3">
                <CheckCircle className="h-12 w-12 text-green-600" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-construction-dark">Message Sent!</h3>
            <p className="text-muted-foreground">
              Thank you for contacting us. Our sales team will reach out within 24 hours.
            </p>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Contact Sales</DialogTitle>
              <DialogDescription>
                Have questions or need custom pricing? Our team is here to help.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Contact Information */}
              <div className="grid grid-cols-2 gap-4">
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

              <div className="grid grid-cols-2 gap-4">
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
                      <SelectItem value="residential">Residential</SelectItem>
                      <SelectItem value="commercial">Commercial</SelectItem>
                      <SelectItem value="industrial">Industrial</SelectItem>
                      <SelectItem value="specialty_trades">Specialty Trades</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Inquiry Details */}
              <div className="space-y-2">
                <Label htmlFor="inquiryType">What are you interested in?</Label>
                <Select
                  value={formData.inquiryType}
                  onValueChange={(value) => setFormData({ ...formData, inquiryType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General Inquiry</SelectItem>
                    <SelectItem value="pricing">Pricing Information</SelectItem>
                    <SelectItem value="enterprise">Enterprise Solutions</SelectItem>
                    <SelectItem value="partnership">Partnership Opportunities</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="estimatedBudget">Estimated Budget (Optional)</Label>
                  <Select
                    value={formData.estimatedBudget}
                    onValueChange={(value) => setFormData({ ...formData, estimatedBudget: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select budget" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="<5k">Less than $5,000/year</SelectItem>
                      <SelectItem value="5k-15k">$5,000 - $15,000/year</SelectItem>
                      <SelectItem value="15k-50k">$15,000 - $50,000/year</SelectItem>
                      <SelectItem value="50k+">$50,000+/year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timeline">Timeline (Optional)</Label>
                  <Select
                    value={formData.timeline}
                    onValueChange={(value) => setFormData({ ...formData, timeline: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select timeline" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="immediate">Immediate (< 1 month)</SelectItem>
                      <SelectItem value="1-3_months">1-3 months</SelectItem>
                      <SelectItem value="3-6_months">3-6 months</SelectItem>
                      <SelectItem value="6-12_months">6-12 months</SelectItem>
                      <SelectItem value="planning">Just Planning</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message *</Label>
                <div className="relative">
                  <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Textarea
                    id="message"
                    placeholder="Tell us about your needs..."
                    className="pl-10 pt-3"
                    rows={4}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isLoading}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 bg-construction-orange hover:bg-construction-orange/90"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Send Message'
                  )}
                </Button>
              </div>

              <p className="text-xs text-center text-muted-foreground">
                By submitting this form, you agree to be contacted by our team.
              </p>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ContactSalesModal;

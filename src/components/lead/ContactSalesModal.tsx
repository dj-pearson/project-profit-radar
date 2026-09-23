import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, Building2, Phone, Mail, MessageSquare, CheckCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Turnstile, useTurnstileToken } from '@/components/security/Turnstile';
import { useToast } from '@/hooks/use-toast';
import { useForm, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CONTACT_SALES_DEFAULTS, contactSalesSchema, type ContactSalesValues } from '@/lib/validations/leads';

type Option = { value: string; label: string };

const COMPANY_SIZES: Option[] = [
  { value: '1-10', label: '1-10 employees' },
  { value: '11-50', label: '11-50 employees' },
  { value: '51-200', label: '51-200 employees' },
  { value: '201-500', label: '201-500 employees' },
  { value: '500+', label: '500+ employees' },
];
const INDUSTRIES: Option[] = [
  { value: 'residential', label: 'Residential' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'industrial', label: 'Industrial' },
  { value: 'specialty_trades', label: 'Specialty Trades' },
];
const INQUIRY_TYPES: Option[] = [
  { value: 'general', label: 'General Inquiry' },
  { value: 'pricing', label: 'Pricing Information' },
  { value: 'enterprise', label: 'Enterprise Solutions' },
  { value: 'partnership', label: 'Partnership Opportunities' },
];
const BUDGETS: Option[] = [
  { value: '<5k', label: 'Less than $5,000/year' },
  { value: '5k-15k', label: '$5,000 - $15,000/year' },
  { value: '15k-50k', label: '$15,000 - $50,000/year' },
  { value: '50k+', label: '$50,000+/year' },
];
const TIMELINES: Option[] = [
  { value: 'immediate', label: 'Immediate (< 1 month)' },
  { value: '1-3_months', label: '1-3 months' },
  { value: '3-6_months', label: '3-6 months' },
  { value: '6-12_months', label: '6-12 months' },
  { value: 'planning', label: 'Just Planning' },
];

type SelectName = 'companySize' | 'industry' | 'inquiryType' | 'estimatedBudget' | 'timeline';

function SelectField({ name, label, placeholder, options }: {
  name: SelectName;
  label: string;
  placeholder?: string;
  options: Option[];
}) {
  const { control } = useFormContext<ContactSalesValues>();
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <Select value={field.value} onValueChange={field.onChange}>
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {options.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

interface ContactSalesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ContactSalesModal = ({ isOpen, onClose }: ContactSalesModalProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { toast } = useToast();
  const human = useTurnstileToken();

  const form = useForm<ContactSalesValues>({
    resolver: zodResolver(contactSalesSchema),
    defaultValues: CONTACT_SALES_DEFAULTS,
  });

  const handleSubmit = async (formData: ContactSalesValues) => {
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
          turnstileToken: human.token ?? undefined,
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
          form.reset(CONTACT_SALES_DEFAULTS);
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

            <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} noValidate className="space-y-4" aria-label="Contact sales form">
              {/* Contact Information */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name *</FormLabel>
                      <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <FormControl>
                          <Input placeholder="John" className="pl-10" autoComplete="given-name" aria-required="true" {...field} />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Smith" autoComplete="family-name" aria-required="true" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Work Email *</FormLabel>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <FormControl>
                        <Input type="email" placeholder="john@company.com" className="pl-10" autoComplete="email" aria-required="true" {...field} />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <FormControl>
                        <Input type="tel" placeholder="(555) 123-4567" className="pl-10" autoComplete="tel" {...field} />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Company Information */}
              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Name *</FormLabel>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <FormControl>
                        <Input placeholder="Your Construction Company" className="pl-10" autoComplete="organization" aria-required="true" {...field} />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <SelectField name="companySize" label="Company Size" placeholder="Select size" options={COMPANY_SIZES} />
                <SelectField name="industry" label="Industry Type" placeholder="Select industry" options={INDUSTRIES} />
              </div>

              {/* Inquiry Details */}
              <SelectField name="inquiryType" label="What are you interested in?" options={INQUIRY_TYPES} />

              <div className="grid grid-cols-2 gap-4">
                <SelectField name="estimatedBudget" label="Estimated Budget (Optional)" placeholder="Select budget" options={BUDGETS} />
                <SelectField name="timeline" label="Timeline (Optional)" placeholder="Select timeline" options={TIMELINES} />
              </div>

              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Message *</FormLabel>
                    <div className="relative">
                      <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <FormControl>
                        <Textarea placeholder="Tell us about your needs..." className="pl-10 pt-3" rows={4} aria-required="true" {...field} />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Turnstile onToken={human.setToken} />

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
                  disabled={isLoading || !human.ready}
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
            </Form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ContactSalesModal;

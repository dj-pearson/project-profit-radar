import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { CalendarCheck, CheckCircle2, Loader2 } from 'lucide-react';

import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { PageSEO } from '@/components/seo/PageSEO';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

/**
 * The public "book a demo" page.
 *
 * Everything behind this already existed: the handle-demo-request edge
 * function validates, rate-limits and writes leads + demo_requests +
 * lead_activities + conversion_events, DemoCalendar reads the queue and
 * ConversionAnalytics counts it. Nothing in the app called it, and the five
 * marketing CTAs pointing at /demo and the exit-intent modal pointing at
 * /demo-request both 404'd. This is the missing door.
 */

// Mirrors DemoRequestSchema in supabase/functions/handle-demo-request/index.ts.
// Deliberately the same limits: a client that accepts more than the server does
// turns a typo into a 400 the user cannot act on.
const formSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(100),
  lastName: z.string().trim().min(1, 'Last name is required').max(100),
  email: z.string().trim().email('Enter a valid email address').max(255),
  companyName: z.string().trim().min(1, 'Company name is required').max(200),
  phone: z.string().trim().max(20, 'Phone number is too long').optional(),
  companySize: z.string().max(50).optional(),
  preferredDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a date')
    .optional()
    .or(z.literal('')),
  preferredTime: z.string().max(50).optional(),
  message: z.string().trim().max(5000, 'Keep it under 5000 characters').optional(),
});

type FormValues = z.infer<typeof formSchema>;

const COMPANY_SIZES = [
  '1-5 employees',
  '6-20 employees',
  '21-50 employees',
  '51-200 employees',
  '200+ employees',
];

const TIME_WINDOWS = [
  'Morning (8am-12pm)',
  'Afternoon (12pm-5pm)',
  'Evening (after 5pm)',
];

const WHAT_YOU_GET = [
  'A walk through job costing on a project shaped like yours',
  "What the field app looks like in a crew member's hands",
  'Straight answers on pricing, migration and what we do not do',
];

const DemoRequest = () => {
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { companySize: '', preferredTime: '' },
  });

  const onSubmit = async (values: FormValues) => {
    // The campaign that produced the click is worth more than the click.
    const params = new URLSearchParams(window.location.search);

    const { data, error } = await supabase.functions.invoke('handle-demo-request', {
      body: {
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        companyName: values.companyName,
        phone: values.phone || undefined,
        companySize: values.companySize || undefined,
        preferredDate: values.preferredDate || undefined,
        preferredTime: values.preferredTime || undefined,
        message: values.message || undefined,
        demoType: 'standard',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        utm_source: params.get('utm_source') || undefined,
        utm_medium: params.get('utm_medium') || undefined,
        utm_campaign: params.get('utm_campaign') || undefined,
      },
    });

    // A request that did not reach the sales queue must not look like one that
    // did - the whole point of this page is that someone calls them back.
    if (error || !data?.success) {
      logger.error(
        'Demo request failed',
        error instanceof Error ? error : new Error(data?.error ?? 'unknown'),
      );
      toast.error('We could not send that', {
        description:
          'Nothing was submitted. Try again, or email sales@brikly.net and we will book it by hand.',
      });
      return;
    }

    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <PageSEO
        title="Book a Brikly Demo | See Real-Time Job Costing on Your Projects"
        description="Book a 30-minute walkthrough of Brikly with someone who knows construction. See job costing, the field app and what migration actually involves. No credit card, no obligation."
        keywords={[
          'construction software demo',
          'book a demo construction management',
          'job costing software demo',
          'contractor software walkthrough',
        ]}
        canonicalUrl="https://brikly.net/demo"
      />

      <Header />

      <main className="py-12 sm:py-16" role="main" aria-label="Book a demo">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
            <div className="space-y-6">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
                See it on a job like yours
              </h1>
              <p className="text-lg text-muted-foreground">
                Thirty minutes with someone who has run construction books. Bring a
                project you are worried about and we will cost it out together.
              </p>
              <ul className="space-y-3">
                {WHAT_YOU_GET.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <CheckCircle2
                      className="h-5 w-5 shrink-0 mt-0.5 text-construction-orange"
                      aria-hidden="true"
                    />
                    <span className="text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
              <p className="text-sm text-muted-foreground">
                Would rather just email?{' '}
                <a className="underline underline-offset-4" href="mailto:sales@brikly.net">
                  sales@brikly.net
                </a>
              </p>
            </div>

            <div className="rounded-lg border bg-card p-6 sm:p-8">
              {submitted ? (
                <div className="text-center py-8 space-y-4" role="status">
                  <CalendarCheck
                    className="h-12 w-12 mx-auto text-construction-orange"
                    aria-hidden="true"
                  />
                  <h2 className="text-xl font-semibold">Booked - we will be in touch</h2>
                  <p className="text-muted-foreground">
                    Your request is with our team. Expect an email within one business
                    day with a time that suits you.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First name</Label>
                      <Input
                        id="firstName"
                        autoComplete="given-name"
                        aria-invalid={!!errors.firstName}
                        aria-describedby={errors.firstName ? 'firstName-error' : undefined}
                        {...register('firstName')}
                      />
                      {errors.firstName && (
                        <p id="firstName-error" className="text-sm text-destructive">
                          {errors.firstName.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last name</Label>
                      <Input
                        id="lastName"
                        autoComplete="family-name"
                        aria-invalid={!!errors.lastName}
                        aria-describedby={errors.lastName ? 'lastName-error' : undefined}
                        {...register('lastName')}
                      />
                      {errors.lastName && (
                        <p id="lastName-error" className="text-sm text-destructive">
                          {errors.lastName.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Work email</Label>
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      aria-invalid={!!errors.email}
                      aria-describedby={errors.email ? 'email-error' : undefined}
                      {...register('email')}
                    />
                    {errors.email && (
                      <p id="email-error" className="text-sm text-destructive">
                        {errors.email.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="companyName">Company</Label>
                    <Input
                      id="companyName"
                      autoComplete="organization"
                      aria-invalid={!!errors.companyName}
                      aria-describedby={errors.companyName ? 'companyName-error' : undefined}
                      {...register('companyName')}
                    />
                    {errors.companyName && (
                      <p id="companyName-error" className="text-sm text-destructive">
                        {errors.companyName.message}
                      </p>
                    )}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone (optional)</Label>
                      <Input
                        id="phone"
                        type="tel"
                        autoComplete="tel"
                        aria-invalid={!!errors.phone}
                        aria-describedby={errors.phone ? 'phone-error' : undefined}
                        {...register('phone')}
                      />
                      {errors.phone && (
                        <p id="phone-error" className="text-sm text-destructive">
                          {errors.phone.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="companySize">Crew size (optional)</Label>
                      <Select
                        value={watch('companySize')}
                        onValueChange={(v) => setValue('companySize', v)}
                      >
                        <SelectTrigger id="companySize">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {COMPANY_SIZES.map((size) => (
                            <SelectItem key={size} value={size}>
                              {size}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="preferredDate">Preferred date (optional)</Label>
                      <Input
                        id="preferredDate"
                        type="date"
                        aria-invalid={!!errors.preferredDate}
                        aria-describedby={
                          errors.preferredDate ? 'preferredDate-error' : undefined
                        }
                        {...register('preferredDate')}
                      />
                      {errors.preferredDate && (
                        <p id="preferredDate-error" className="text-sm text-destructive">
                          {errors.preferredDate.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="preferredTime">Preferred time (optional)</Label>
                      <Select
                        value={watch('preferredTime')}
                        onValueChange={(v) => setValue('preferredTime', v)}
                      >
                        <SelectTrigger id="preferredTime">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {TIME_WINDOWS.map((slot) => (
                            <SelectItem key={slot} value={slot}>
                              {slot}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">
                      What would you like to see? (optional)
                    </Label>
                    <Textarea
                      id="message"
                      rows={3}
                      placeholder="The project or the problem you want us to walk through."
                      aria-invalid={!!errors.message}
                      aria-describedby={errors.message ? 'message-error' : undefined}
                      {...register('message')}
                    />
                    {errors.message && (
                      <p id="message-error" className="text-sm text-destructive">
                        {errors.message.message}
                      </p>
                    )}
                  </div>

                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                        Sending
                      </>
                    ) : (
                      'Book my demo'
                    )}
                  </Button>

                  <p className="text-xs text-muted-foreground text-center">
                    No credit card. We use your details to arrange the demo and nothing
                    else - see our{' '}
                    <a className="underline underline-offset-4" href="/privacy-policy">
                      Privacy Policy
                    </a>
                    .
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default DemoRequest;

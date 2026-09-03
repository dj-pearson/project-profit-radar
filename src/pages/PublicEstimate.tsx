/**
 * The page a prospect lands on from the estimate email (US-325).
 *
 * No account, no session. The token in the URL is the whole credential, and
 * every query goes through the public-estimate edge function, which holds the
 * service role and returns only what someone deciding whether to hire a
 * contractor needs to see.
 *
 * "Send to Client" used to flip a status and send nothing, so this page is the
 * first thing in the product that a customer of a customer can actually reach.
 */
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SignatureCapture } from '@/components/ui/signature-capture';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2, FileText } from 'lucide-react';

interface LineItem {
  item_name: string;
  description: string | null;
  quantity: number;
  unit: string;
  unit_cost: number;
  total_cost: number | null;
}

interface EstimateView {
  companyName: string;
  estimate: {
    id: string;
    estimate_number: string;
    title: string;
    description: string | null;
    client_name: string | null;
    total_amount: number;
    subtotal: number | null;
    tax_amount: number | null;
    discount_amount: number | null;
    valid_until: string | null;
    terms_and_conditions: string | null;
    notes: string | null;
  };
  lineItems: LineItem[];
  alreadyAccepted: boolean;
}

const money = (n: number | null | undefined) =>
  (n ?? 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

export default function PublicEstimate() {
  const { token } = useParams<{ token: string }>();
  const { toast } = useToast();

  const [view, setView] = useState<EstimateView | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [typedSignature, setTypedSignature] = useState('');
  const [drawnSignature, setDrawnSignature] = useState<string | null>(null);
  const [signatureMode, setSignatureMode] = useState<'typed' | 'drawn'>('typed');

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);

    const { data, error } = await supabase.functions.invoke('public-estimate', {
      body: { action: 'view', token },
    });

    if (error || data?.success === false) {
      setLoadError(
        data?.error ||
        'This estimate link is no longer active. Ask your contractor to send a new one.'
      );
      setView(null);
    } else {
      setView(data.data as EstimateView);
      setAccepted(Boolean(data.data?.alreadyAccepted));
      setName(data.data?.estimate?.client_name || '');
    }
    setLoading(false);
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  const accept = async () => {
    const signature = signatureMode === 'typed' ? typedSignature.trim() : drawnSignature;

    if (!name.trim()) {
      toast({ variant: 'destructive', title: 'Please enter your name' });
      return;
    }
    if (!signature) {
      toast({
        variant: 'destructive',
        title: 'A signature is required',
        description: signatureMode === 'typed' ? 'Type your full name to sign.' : 'Draw your signature to sign.',
      });
      return;
    }

    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke('public-estimate', {
      body: {
        action: 'accept',
        token,
        accepted_by_name: name.trim(),
        accepted_by_email: email.trim() || undefined,
        signature,
        signature_type: signatureMode,
      },
    });
    setSubmitting(false);

    if (error || data?.success === false) {
      toast({
        variant: 'destructive',
        title: 'Could not record your acceptance',
        description: data?.error || 'Please try again, or contact your contractor.',
      });
      return;
    }

    setAccepted(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/30 py-12 px-4">
        <div className="max-w-3xl mx-auto space-y-4">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (loadError || !view) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>This link is not active</CardTitle>
            <CardDescription>{loadError}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const { estimate, lineItems, companyName } = view;

  return (
    <div className="min-h-screen bg-muted/30 py-12 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <p className="text-sm text-muted-foreground">{companyName}</p>
          <h1 className="text-2xl font-semibold">{estimate.title}</h1>
          <p className="text-sm text-muted-foreground">
            Estimate {estimate.estimate_number}
            {estimate.valid_until
              ? ` · valid until ${new Date(estimate.valid_until).toLocaleDateString()}`
              : ''}
          </p>
        </div>

        {accepted && (
          <Card className="border-green-600">
            <CardContent className="flex items-start gap-3 pt-6">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" aria-hidden="true" />
              <div>
                <p className="font-medium">You have accepted this estimate.</p>
                <p className="text-sm text-muted-foreground">
                  {companyName} has been notified and will be in touch about next steps.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5" aria-hidden="true" />
              What is included
            </CardTitle>
            {estimate.description && <CardDescription>{estimate.description}</CardDescription>}
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">Item</th>
                    <th className="py-2 pr-4 font-medium text-right">Qty</th>
                    <th className="py-2 pr-4 font-medium text-right">Rate</th>
                    <th className="py-2 font-medium text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item, i) => (
                    <tr key={`${item.item_name}-${i}`} className="border-b last:border-0">
                      <td className="py-2 pr-4">
                        <div className="font-medium">{item.item_name}</div>
                        {item.description && (
                          <div className="text-muted-foreground">{item.description}</div>
                        )}
                      </td>
                      <td className="py-2 pr-4 text-right">{item.quantity} {item.unit}</td>
                      <td className="py-2 pr-4 text-right">{money(item.unit_cost)}</td>
                      <td className="py-2 text-right">
                        {money(item.total_cost ?? item.quantity * item.unit_cost)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 space-y-1 text-sm">
              {estimate.subtotal != null && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{money(estimate.subtotal)}</span>
                </div>
              )}
              {!!estimate.discount_amount && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Discount</span>
                  <span>-{money(estimate.discount_amount)}</span>
                </div>
              )}
              {!!estimate.tax_amount && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span>{money(estimate.tax_amount)}</span>
                </div>
              )}
              <div className="flex justify-between border-t pt-2 text-base font-semibold">
                <span>Total</span>
                <span>{money(estimate.total_amount)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {estimate.terms_and_conditions && (
          <Card>
            <CardHeader><CardTitle className="text-lg">Terms</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                {estimate.terms_and_conditions}
              </p>
            </CardContent>
          </Card>
        )}

        {!accepted && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Accept this estimate</CardTitle>
              <CardDescription>
                Signing here means you agree to {money(estimate.total_amount)} for the work above.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="accept-name">Your name</Label>
                  <Input
                    id="accept-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Dana Whitfield"
                  />
                </div>
                <div>
                  <Label htmlFor="accept-email">Your email (optional)</Label>
                  <Input
                    id="accept-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="dana@example.com"
                  />
                </div>
              </div>

              <Tabs
                value={signatureMode}
                onValueChange={(v) => setSignatureMode(v as 'typed' | 'drawn')}
              >
                <TabsList>
                  <TabsTrigger value="typed">Type it</TabsTrigger>
                  <TabsTrigger value="drawn">Draw it</TabsTrigger>
                </TabsList>
                <TabsContent value="typed" className="pt-3">
                  <Label htmlFor="accept-signature">Type your full name to sign</Label>
                  <Input
                    id="accept-signature"
                    value={typedSignature}
                    onChange={(e) => setTypedSignature(e.target.value)}
                    placeholder="Dana Whitfield"
                    className="font-serif text-lg"
                  />
                </TabsContent>
                <TabsContent value="drawn" className="pt-3">
                  <SignatureCapture
                    value={drawnSignature}
                    onChange={setDrawnSignature}
                    label="Draw your signature"
                  />
                </TabsContent>
              </Tabs>

              <Button onClick={accept} disabled={submitting} size="lg">
                {submitting ? 'Recording your acceptance...' : 'Accept estimate'}
              </Button>
              <p className="text-xs text-muted-foreground">
                Your name, the time and your IP address are recorded with this acceptance.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

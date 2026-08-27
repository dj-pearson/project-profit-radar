import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldOff } from 'lucide-react';

/**
 * Shown when SecureRoute refuses a page (US-312).
 *
 * SecureRoute has redirected to /unauthorized in three places since it was
 * written, and no route ever answered that path, so a refusal landed on the
 * catch-all 404: "Brikly / Page not found". A user who is signed in and simply
 * lacks the role could not tell that apart from a bad link, and neither could
 * whoever they asked for help.
 *
 * The path that was refused is passed through router state rather than shown
 * from the URL, because the URL here is /unauthorized either way.
 */
export default function AccessDenied() {
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
      <Card className="max-w-md w-full">
        <CardHeader>
          <ShieldOff className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
          <CardTitle>You do not have access to this page</CardTitle>
          <CardDescription>
            {from
              ? `Your account is signed in, but it is not permitted to open ${from}.`
              : 'Your account is signed in, but it is not permitted to open that page.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Access is set by your role. If you think this is wrong, ask an administrator on your
            account to change your role, and tell them which page you were trying to reach.
          </p>
          <div className="flex gap-2">
            <Button asChild>
              <Link to="/dashboard">Back to dashboard</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/support">Contact support</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

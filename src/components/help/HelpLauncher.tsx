import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { HelpCircle } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { HelpCenter } from './HelpCenter';

/**
 * US-079: Global in-app help launcher.
 *
 * A floating "?" button (bottom-right, on every page) that opens the HelpCenter
 * in a slide-over panel (not a new page). Help content is made context-aware by
 * mapping the current route to a HelpCenter category so the most relevant
 * articles surface first. The underlying Sheet (Radix Dialog) provides the focus
 * trap, ARIA wiring, Escape-to-close, and click-outside dismissal.
 */

const ROUTE_CATEGORY: Array<{ match: RegExp; category: string }> = [
  { match: /^\/projects/, category: 'projects' },
  { match: /^\/(invoices|financial|expenses|budget|accounts|billing|estimates|job-costing)/, category: 'financial' },
  { match: /^\/(team|crew|people|subcontractors)/, category: 'team' },
  { match: /^\/(schedule|calendar|daily-reports)/, category: 'scheduling' },
  { match: /^\/(settings|admin|user-settings|profile)/, category: 'settings' },
];

function categoryForPath(pathname: string): string | null {
  return ROUTE_CATEGORY.find((r) => r.match.test(pathname))?.category ?? null;
}

export function HelpLauncher() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const category = categoryForPath(pathname);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label="Open help center"
          className="fixed bottom-4 right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 print:hidden"
        >
          <HelpCircle className="h-6 w-6" aria-hidden="true" />
        </button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto p-4 sm:max-w-lg"
        aria-label="Help center"
      >
        {/* Remount when the route category changes so the relevant category is preselected each open. */}
        <HelpCenter key={category ?? 'all'} initialCategory={category} />
      </SheetContent>
    </Sheet>
  );
}

export default HelpLauncher;

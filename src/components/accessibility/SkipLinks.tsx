import React from 'react';
import { Button } from "@/components/ui/button";

/**
 * Resolve a skip-link target: try the explicit id first, then fall back to
 * generic landmark selectors so the link works across every layout (dashboard,
 * marketing, legal) even where the id was never set. The element is made
 * programmatically focusable (tabIndex -1) before focusing so landmarks like
 * <nav>/<main> that aren't natively focusable still receive focus — otherwise
 * the "skip" link moves the viewport but not keyboard focus (a WCAG 2.4.1 fail).
 */
const focusTarget = (id: string, fallbackSelector: string) => {
  const target =
    document.getElementById(id) ??
    document.querySelector<HTMLElement>(fallbackSelector);
  if (!target) return;
  if (!target.hasAttribute('tabindex')) {
    target.setAttribute('tabindex', '-1');
  }
  target.focus();
  target.scrollIntoView({ behavior: 'smooth' });
};

export const SkipLinks: React.FC = () => {
  const skipToContent = () => focusTarget('main-content', 'main, [role="main"]');

  const skipToNavigation = () =>
    focusTarget('main-navigation', 'nav[aria-label], [role="navigation"], nav');

  const skipToSearch = () =>
    focusTarget('search', '[role="search"] input, input[type="search"], [role="search"]');

  return (
    <div className="sr-only focus-within:not-sr-only">
      <div className="fixed top-0 left-0 z-50 bg-primary text-primary-foreground p-2 space-x-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={skipToContent}
          className="focus:not-sr-only"
        >
          Skip to main content
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={skipToNavigation}
          className="focus:not-sr-only"
        >
          Skip to navigation
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={skipToSearch}
          className="focus:not-sr-only"
        >
          Skip to search
        </Button>
      </div>
    </div>
  );
};
/**
 * AccessiblePageWrapper Component
 *
 * Provides proper semantic HTML landmarks and ARIA attributes for page accessibility.
 * This component ensures WCAG 2.1 Level AA compliance for page structure.
 *
 * Landmarks provided:
 * - <header role="banner"> - Page header/navigation
 * - <nav role="navigation"> - Main navigation
 * - <main role="main"> - Main content area (with skip link target)
 * - <aside role="complementary"> - Sidebar/supplementary content
 * - <footer role="contentinfo"> - Page footer
 *
 * Usage:
 * <AccessiblePageWrapper
 *   pageTitle="Dashboard"
 *   header={<HeaderComponent />}
 *   nav={<NavComponent />}
 *   sidebar={<SidebarComponent />}
 *   footer={<FooterComponent />}
 * >
 *   <main content here>
 * </AccessiblePageWrapper>
 */

import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { SkipLinks } from './SkipLinks';
import { cn } from '@/lib/utils';

export interface AccessiblePageWrapperProps {
  /** Page title for accessibility announcements */
  pageTitle: string;
  /** Header content (wrapped in <header role="banner">) */
  header?: React.ReactNode;
  /** Navigation content (wrapped in <nav role="navigation">) */
  nav?: React.ReactNode;
  /** Sidebar content (wrapped in <aside role="complementary">) */
  sidebar?: React.ReactNode;
  /** Footer content (wrapped in <footer role="contentinfo">) */
  footer?: React.ReactNode;
  /** Main content (children, wrapped in <main role="main">) */
  children: React.ReactNode;
  /** Additional class names for the wrapper */
  className?: string;
  /** Whether to announce page changes to screen readers */
  announcePageChanges?: boolean;
  /** Custom aria-label for main content region */
  mainLabel?: string;
  /** Custom aria-label for navigation region */
  navLabel?: string;
  /** Custom aria-label for sidebar region */
  sidebarLabel?: string;
}

/**
 * Screen reader announcer for page changes
 */
const PageAnnouncer: React.FC<{ pageTitle: string }> = ({ pageTitle }) => {
  const location = useLocation();
  const announcerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Announce page change to screen readers
    if (announcerRef.current) {
      announcerRef.current.textContent = `Navigated to ${pageTitle}`;
      // Clear after announcement
      const timeout = setTimeout(() => {
        if (announcerRef.current) {
          announcerRef.current.textContent = '';
        }
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, [location.pathname, pageTitle]);

  return (
    <div
      ref={announcerRef}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    />
  );
};

export const AccessiblePageWrapper: React.FC<AccessiblePageWrapperProps> = ({
  pageTitle,
  header,
  nav,
  sidebar,
  footer,
  children,
  className,
  announcePageChanges = true,
  mainLabel = 'Main content',
  navLabel = 'Main navigation',
  sidebarLabel = 'Supplementary content',
}) => {
  const mainRef = useRef<HTMLElement>(null);
  const location = useLocation();

  // Move focus to main content on route change for keyboard users
  useEffect(() => {
    // Small delay to ensure DOM is ready
    const timeout = setTimeout(() => {
      if (mainRef.current) {
        // Only focus if user was using keyboard navigation
        const wasKeyboardNav = document.body.classList.contains('keyboard-navigation');
        if (wasKeyboardNav) {
          mainRef.current.focus();
        }
      }
    }, 100);
    return () => clearTimeout(timeout);
  }, [location.pathname]);

  return (
    <div className={cn('min-h-screen flex flex-col', className)}>
      {/* Skip Links for keyboard navigation */}
      <SkipLinks />

      {/* Page change announcer for screen readers */}
      {announcePageChanges && <PageAnnouncer pageTitle={pageTitle} />}

      {/* Header / Banner Region */}
      {header && (
        <header role="banner" aria-label={`${pageTitle} header`}>
          {header}
        </header>
      )}

      {/* Navigation Region */}
      {nav && (
        <nav role="navigation" aria-label={navLabel}>
          {nav}
        </nav>
      )}

      {/* Main Content Area with optional Sidebar */}
      <div className="flex-1 flex">
        {/* Sidebar / Complementary Region */}
        {sidebar && (
          <aside
            role="complementary"
            aria-label={sidebarLabel}
            className="flex-shrink-0"
          >
            {sidebar}
          </aside>
        )}

        {/* Main Content Region */}
        <main
          ref={mainRef}
          id="main-content"
          role="main"
          aria-label={mainLabel}
          tabIndex={-1}
          className="flex-1 outline-none focus:outline-none"
        >
          {children}
        </main>
      </div>

      {/* Footer / Content Info Region */}
      {footer && (
        <footer role="contentinfo" aria-label={`${pageTitle} footer`}>
          {footer}
        </footer>
      )}
    </div>
  );
};

/**
 * Simplified wrapper for content sections within a page
 * Use this for sectioning content with proper landmarks
 */
export interface ContentSectionProps {
  /** Section heading (required for accessibility) */
  heading: string;
  /** Heading level (h2-h6, h1 should be page title) */
  headingLevel?: 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  /** Whether to visually hide the heading (still accessible to screen readers) */
  hideHeading?: boolean;
  /** Section content */
  children: React.ReactNode;
  /** Additional class names */
  className?: string;
  /** ARIA label for the section (uses heading by default) */
  ariaLabel?: string;
}

export const ContentSection: React.FC<ContentSectionProps> = ({
  heading,
  headingLevel = 'h2',
  hideHeading = false,
  children,
  className,
  ariaLabel,
}) => {
  const HeadingTag = headingLevel;

  return (
    <section
      aria-labelledby={ariaLabel ? undefined : `section-${heading.toLowerCase().replace(/\s+/g, '-')}`}
      aria-label={ariaLabel}
      className={className}
    >
      <HeadingTag
        id={`section-${heading.toLowerCase().replace(/\s+/g, '-')}`}
        className={hideHeading ? 'sr-only' : undefined}
      >
        {heading}
      </HeadingTag>
      {children}
    </section>
  );
};

/**
 * Region component for grouping related content
 * Use when you need to create a named region without a visible heading
 */
export interface RegionProps {
  /** Accessible name for the region */
  label: string;
  /** Region content */
  children: React.ReactNode;
  /** Additional class names */
  className?: string;
}

export const Region: React.FC<RegionProps> = ({
  label,
  children,
  className,
}) => {
  return (
    <div role="region" aria-label={label} className={className}>
      {children}
    </div>
  );
};

export default AccessiblePageWrapper;

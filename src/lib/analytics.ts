import { supabase } from '@/integrations/supabase/client';
import { logger } from './logger';
import { safeStorage } from './safeStorage';
import { mayLoadAnalytics, subscribeToConsent } from '@/lib/consent/consentStore';

/**
 * Analytics tracking utilities for Brikly
 * Integrates with PostHog (when available) and Supabase for event tracking
 *
 * Consent gating (GDPR/ePrivacy "consent before collection"): the third-party
 * PostHog tracker — which sets cookies, autocaptures, and records sessions — is
 * only initialized once the user has granted the `analytics` category via the
 * cookie banner (or a jurisdiction where GPC is not signalling opt-out). We
 * subscribe to consent changes so opt-in/opt-out takes effect live, without a
 * page reload, mirroring the Google Consent Mode v2 gating in index.html.
 * See `src/lib/consent/consentStore.ts`.
 */

// Types
export interface EventProperties {
  [key: string]: string | number | boolean | null | undefined;
}

export interface ConversionEvent {
  event_type: string;
  event_step?: number;
  funnel_name?: string;
  event_value?: number;
  event_metadata?: EventProperties;
}

export interface UserProperties {
  email?: string;
  name?: string;
  company?: string;
  plan?: string;
  [key: string]: string | number | boolean | null | undefined;
}

// PostHog interface for the subset of methods we use
interface PostHogInstance {
  init(apiKey: string, options: Record<string, unknown>): void;
  capture(event: string, properties?: Record<string, unknown>): void;
  identify(userId: string, properties?: Record<string, unknown>): void;
  reset(): void;
  opt_in_capturing?(): void;
  opt_out_capturing?(): void;
}

// Initialize PostHog (lazy loaded)
let posthog: PostHogInstance | null = null;

const initPostHog = async () => {
  if (typeof window === 'undefined') return null;
  // Consent gate: never load the third-party tracker without analytics consent.
  if (!mayLoadAnalytics()) return null;
  if (posthog) return posthog;

  // Only load if API key is available
  const apiKey = import.meta.env.VITE_POSTHOG_API_KEY;
  if (!apiKey) {
    logger.info('PostHog API key not found. Analytics will be tracked in Supabase only.');
    return null;
  }

  try {
    const { default: posthogLib } = await import('posthog-js');
    posthog = posthogLib;
    posthog.init(apiKey, {
      api_host: import.meta.env.VITE_POSTHOG_HOST || 'https://app.posthog.com',
      autocapture: true,
      capture_pageview: true,
      capture_pageleave: true,
      session_recording: {
        enabled: true,
        recordCrossOriginIframes: true,
      },
    });
    logger.info('PostHog initialized successfully');
    return posthog;
  } catch (error) {
    logger.error('Failed to initialize PostHog', error as Error);
    return null;
  }
};

// Track event in Supabase
const trackInSupabase = async (
  eventName: string,
  properties?: EventProperties
) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    // Get URL parameters for attribution
    const urlParams = new URLSearchParams(window.location.search);

  // Best-effort by design, but the error was dropped and supabase-js returns it
  // rather than throwing, so the catch below never saw a failed write and the
  // analytics gap was invisible (US-300).
  const { error: eventError } = await supabase.from('user_events').insert({
    user_id: user?.id || null,
    anonymous_id: !user ? getAnonymousId() : null,
    event_name: eventName,
    event_category: getCategoryFromEvent(eventName),
    event_properties: properties || {},
    page_url: window.location.href,
    page_title: document.title,
    referrer: document.referrer,
    user_agent: navigator.userAgent,
    utm_source: urlParams.get('utm_source'),
    utm_medium: urlParams.get('utm_medium'),
    utm_campaign: urlParams.get('utm_campaign'),
    utm_content: urlParams.get('utm_content'),
    utm_term: urlParams.get('utm_term'),
  });

  if (eventError) {
    logger.error('Supabase tracking error', new Error(eventError.message), { eventName });
  }
  } catch (error) {
    logger.error('Supabase tracking error', error as Error, { eventName });
  }
};

// Get or create anonymous ID
const getAnonymousId = (): string => {
  let anonId = safeStorage.getItem('anonId');
  if (!anonId) {
    anonId = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    safeStorage.setItem('anonId', anonId);
  }
  return anonId || `anon_${Date.now()}`; // Fallback if storage fails
};

// Categorize events
const getCategoryFromEvent = (eventName: string): string => {
  if (eventName.includes('signup') || eventName.includes('register')) return 'acquisition';
  if (eventName.includes('project_created') || eventName.includes('first_')) return 'activation';
  if (eventName.includes('_used') || eventName.includes('_viewed')) return 'engagement';
  if (eventName.includes('upgrade') || eventName.includes('converted') || eventName.includes('payment')) return 'conversion';
  if (eventName.includes('login') || eventName.includes('session')) return 'retention';
  return 'other';
};

/**
 * Reconcile the PostHog tracker with the current analytics-consent state.
 * - Consent granted  → initialize (first time) or resume capturing.
 * - Consent withdrawn → stop capturing (opt-out), without tearing the SDK down.
 * Called on startup and on every consent change.
 */
const applyConsentToPostHog = async (): Promise<void> => {
  if (mayLoadAnalytics()) {
    if (!posthog) {
      await initPostHog();
    } else {
      try {
        posthog.opt_in_capturing?.();
      } catch {
        /* posthog SDK not ready — no-op */
      }
    }
  } else if (posthog) {
    try {
      posthog.opt_out_capturing?.();
    } catch {
      /* posthog SDK not ready — no-op */
    }
  }
};

// Core Analytics Class
export class Analytics {
  private static initialized = false;
  private static consentUnsub: (() => void) | null = null;

  static async init() {
    if (this.initialized) return;
    this.initialized = true;
    // React to later opt-in / opt-out without a page reload.
    if (typeof window !== 'undefined' && !this.consentUnsub) {
      this.consentUnsub = subscribeToConsent(() => {
        void applyConsentToPostHog();
      });
    }
    await applyConsentToPostHog();
  }

  /**
   * Track a custom event
   */
  static async track(eventName: string, properties?: EventProperties) {
    // Track in PostHog only when initialized AND analytics consent is active.
    if (posthog && mayLoadAnalytics()) {
      posthog.capture(eventName, properties);
    }

    // Always track in Supabase
    await trackInSupabase(eventName, properties);
  }

  /**
   * Identify a user
   */
  static async identify(userId: string, properties?: UserProperties) {
    if (posthog && mayLoadAnalytics()) {
      posthog.identify(userId, properties);
    }

    // Store user properties
    try {
      const { error: propsError } = await supabase.from('user_engagement_summary').upsert({
        user_id: userId,
        ...properties,
      }, { onConflict: 'user_id' });

      if (propsError) {
        logger.error('Failed to update user properties', new Error(propsError.message), { userId });
      }
    } catch (error) {
      logger.error('Failed to update user properties', error as Error, { userId });
    }
  }

  /**
   * Track a page view
   */
  static async page(pageName?: string, properties?: EventProperties) {
    if (posthog && mayLoadAnalytics()) {
      posthog.capture('$pageview', {
        $current_url: window.location.href,
        page_name: pageName,
        ...properties,
      });
    }

    await this.track('page_view', {
      page_name: pageName || document.title,
      page_url: window.location.href,
      ...properties,
    });
  }

  /**
   * Track a conversion event (for funnel analysis)
   */
  static async trackConversion(event: ConversionEvent) {
    const urlParams = new URLSearchParams(window.location.search);
    const { data: { user } } = await supabase.auth.getUser();

    try {
      const { error: conversionError } = await supabase.from('conversion_events').insert({
        user_id: user?.id || null,
        anonymous_id: !user ? getAnonymousId() : null,
        event_type: event.event_type,
        event_step: event.event_step,
        funnel_name: event.funnel_name,
        event_value: event.event_value,
        source_page: window.location.pathname,
        referrer: document.referrer,
        utm_source: urlParams.get('utm_source'),
        utm_medium: urlParams.get('utm_medium'),
        utm_campaign: urlParams.get('utm_campaign'),
        utm_content: urlParams.get('utm_content'),
        utm_term: urlParams.get('utm_term'),
        event_metadata: event.event_metadata,
      });

      if (conversionError) {
        logger.error('Conversion tracking error', new Error(conversionError.message), {
          eventType: event.event_type,
          funnelName: event.funnel_name,
        });
      }
    } catch (error) {
      logger.error('Conversion tracking error', error as Error, {
        eventType: event.event_type,
        funnelName: event.funnel_name
      });
    }

    // Also track as regular event
    await this.track(event.event_type, event.event_metadata);
  }

  /**
   * Reset user identity (on logout)
   */
  static reset() {
    if (posthog) {
      posthog.reset();
    }
  }
}

// Convenience exports for common events
export const trackSignupStarted = (properties?: EventProperties) =>
  Analytics.trackConversion({
    event_type: 'signup_started',
    event_step: 2,
    funnel_name: 'signup_funnel',
    event_metadata: properties,
  });

export const trackSignupCompleted = (properties?: EventProperties) =>
  Analytics.trackConversion({
    event_type: 'signup_completed',
    event_step: 3,
    funnel_name: 'signup_funnel',
    event_metadata: properties,
  });

export const trackTrialStarted = (properties?: EventProperties) =>
  Analytics.trackConversion({
    event_type: 'trial_started',
    event_step: 4,
    funnel_name: 'signup_funnel',
    event_metadata: properties,
  });

export const trackProjectCreated = (properties?: EventProperties) =>
  Analytics.track('project_created', properties);

export const trackUpgradeViewed = (properties?: EventProperties) =>
  Analytics.trackConversion({
    event_type: 'upgrade_viewed',
    event_step: 1,
    funnel_name: 'upgrade_funnel',
    event_metadata: properties,
  });

export const trackUpgradeStarted = (properties?: EventProperties) =>
  Analytics.trackConversion({
    event_type: 'upgrade_started',
    event_step: 2,
    funnel_name: 'upgrade_funnel',
    event_metadata: properties,
  });

export const trackTrialConverted = (plan: string, mrr: number, properties?: EventProperties) =>
  Analytics.trackConversion({
    event_type: 'trial_converted',
    event_step: 3,
    funnel_name: 'upgrade_funnel',
    event_value: mrr,
    event_metadata: { plan, mrr, ...properties },
  });

export const trackFeatureUsed = (featureName: string, properties?: EventProperties) =>
  Analytics.track('feature_used', { feature: featureName, ...properties });

export const trackDemoRequested = (properties?: EventProperties) =>
  Analytics.trackConversion({
    event_type: 'demo_requested',
    event_step: 2,
    funnel_name: 'sales_funnel',
    event_metadata: properties,
  });

export const trackSalesContactRequested = (properties?: EventProperties) =>
  Analytics.trackConversion({
    event_type: 'sales_contact_requested',
    event_step: 2,
    funnel_name: 'sales_funnel',
    event_metadata: properties,
  });

export const trackLeadCaptured = (interestType: string, properties?: EventProperties) =>
  Analytics.trackConversion({
    event_type: 'lead_captured',
    event_step: 1,
    funnel_name: 'marketing_funnel',
    event_metadata: { interest_type: interestType, ...properties },
  });

export const trackExitIntentShown = (variant: string) =>
  Analytics.track('exit_intent_shown', { variant });

export const trackExitIntentConverted = (variant: string, properties?: EventProperties) =>
  Analytics.track('exit_intent_converted', { variant, ...properties });

// Financial Intelligence Content Tracking
export const trackHealthCheckStarted = (properties?: EventProperties) =>
  Analytics.trackConversion({
    event_type: 'health_check_started',
    event_step: 1,
    funnel_name: 'health_check_funnel',
    event_metadata: properties,
  });

export const trackHealthCheckQuestion = (questionNumber: number, totalQuestions: number, properties?: EventProperties) =>
  Analytics.track('health_check_question_answered', {
    question_number: questionNumber,
    total_questions: totalQuestions,
    progress_percentage: Math.round((questionNumber / totalQuestions) * 100),
    ...properties,
  });

export const trackHealthCheckCompleted = (score: number, riskLevel: string, estimatedCost: number, properties?: EventProperties) =>
  Analytics.trackConversion({
    event_type: 'health_check_completed',
    event_step: 2,
    funnel_name: 'health_check_funnel',
    event_value: estimatedCost,
    event_metadata: {
      score,
      risk_level: riskLevel,
      estimated_annual_cost: estimatedCost,
      ...properties,
    },
  });

export const trackHealthCheckEmailCaptured = (score: number, properties?: EventProperties) =>
  Analytics.trackConversion({
    event_type: 'health_check_email_captured',
    event_step: 3,
    funnel_name: 'health_check_funnel',
    event_metadata: { score, ...properties },
  });

// Blog Engagement Tracking
export const trackBlogPostViewed = (articleTitle: string, articleSlug: string, properties?: EventProperties) =>
  Analytics.track('blog_post_viewed', {
    article_title: articleTitle,
    article_slug: articleSlug,
    ...properties,
  });

export const trackBlogScrollDepth = (articleTitle: string, scrollDepth: number, properties?: EventProperties) =>
  Analytics.track(`blog_post_read_${scrollDepth}`, {
    article_title: articleTitle,
    scroll_depth: scrollDepth,
    ...properties,
  });

export const trackBlogCTAClicked = (articleTitle: string, ctaText: string, destination: string, properties?: EventProperties) =>
  Analytics.track('blog_cta_clicked', {
    article_title: articleTitle,
    cta_text: ctaText,
    destination,
    ...properties,
  });

// ROI Calculator Tracking
export const trackROICalculatorStarted = (properties?: EventProperties) =>
  Analytics.trackConversion({
    event_type: 'roi_calculator_started',
    event_step: 1,
    funnel_name: 'roi_calculator_funnel',
    event_metadata: properties,
  });

export const trackROICalculatorCompleted = (projectedROI: number, annualSavings: number, properties?: EventProperties) =>
  Analytics.trackConversion({
    event_type: 'roi_calculator_completed',
    event_step: 2,
    funnel_name: 'roi_calculator_funnel',
    event_value: annualSavings,
    event_metadata: {
      projected_roi: projectedROI,
      annual_savings: annualSavings,
      ...properties,
    },
  });

// Demo and Video Tracking
export const trackDemoVideoPlayed = (videoTitle: string, properties?: EventProperties) =>
  Analytics.track('demo_video_played', {
    video_title: videoTitle,
    ...properties,
  });

export const trackDemoVideoProgress = (videoTitle: string, percentComplete: number, properties?: EventProperties) =>
  Analytics.track('demo_video_progress', {
    video_title: videoTitle,
    percent_complete: percentComplete,
    ...properties,
  });

export const trackDemoVideoCompleted = (videoTitle: string, watchDuration: number, properties?: EventProperties) =>
  Analytics.track('demo_video_completed', {
    video_title: videoTitle,
    watch_duration_seconds: watchDuration,
    ...properties,
  });

// CTA Click Tracking
export const trackCTAClick = (ctaLocation: string, ctaText: string, destination: string, properties?: EventProperties) =>
  Analytics.track('cta_clicked', {
    cta_location: ctaLocation,
    cta_text: ctaText,
    destination,
    ...properties,
  });

// Financial Intelligence Feature Tracking
export const trackPredictiveAlertViewed = (alertType: string, severity: string, predictedImpact: number, properties?: EventProperties) =>
  Analytics.track('predictive_alert_viewed', {
    alert_type: alertType,
    severity,
    predicted_impact: predictedImpact,
    ...properties,
  });

export const trackPredictiveAlertActioned = (alertType: string, action: string, timeToAction: number, properties?: EventProperties) =>
  Analytics.track('predictive_alert_actioned', {
    alert_type: alertType,
    action_taken: action,
    time_to_action_hours: timeToAction,
    ...properties,
  });

export const trackDecisionImpactCalculated = (decisionType: string, currentMargin: number, projectedMargin: number, properties?: EventProperties) =>
  Analytics.track('decision_impact_calculated', {
    decision_type: decisionType,
    current_margin: currentMargin,
    projected_margin: projectedMargin,
    margin_impact: currentMargin - projectedMargin,
    ...properties,
  });

export const trackCashFlowForecastViewed = (runwayDays: number, projectedDeficit: number | null, properties?: EventProperties) =>
  Analytics.track('cash_flow_forecast_viewed', {
    runway_days: runwayDays,
    projected_deficit: projectedDeficit,
    ...properties,
  });

// Lead Magnet Tracking
export const trackLeadMagnetViewed = (leadMagnetType: string, properties?: EventProperties) =>
  Analytics.track('lead_magnet_viewed', {
    lead_magnet_type: leadMagnetType,
    ...properties,
  });

export const trackLeadMagnetDownloaded = (leadMagnetType: string, properties?: EventProperties) =>
  Analytics.trackConversion({
    event_type: 'lead_magnet_downloaded',
    event_step: 2,
    funnel_name: 'lead_magnet_funnel',
    event_metadata: {
      lead_magnet_type: leadMagnetType,
      ...properties,
    },
  });

// Comparison Page Tracking
export const trackComparisonViewed = (competitor: string, properties?: EventProperties) =>
  Analytics.track('comparison_viewed', {
    competitor,
    ...properties,
  });

export const trackComparisonCTAClicked = (competitor: string, ctaText: string, properties?: EventProperties) =>
  Analytics.track('comparison_cta_clicked', {
    competitor,
    cta_text: ctaText,
    ...properties,
  });

// Core Web Vitals (US-207): real-user performance monitoring.
// Emitted to PostHog (when VITE_POSTHOG_API_KEY is set) AND always persisted to
// Supabase `user_events`, so field LCP/INP/CLS distributions can be queried by
// device/connection/page even before PostHog finishes lazy-loading (events are
// never dropped because the Supabase write is independent of PostHog readiness).
//
// Dashboard/query: in PostHog, chart the `web_vital` event broken down by
// `metric_name`; or in Supabase:
//   select event_properties->>'metric_name' as metric,
//          percentile_cont(0.75) within group (order by (event_properties->>'metric_value')::numeric) as p75
//   from user_events where event_name = 'web_vital' group by 1;
export interface WebVitalSample {
  name: string; // CLS | FCP | INP | LCP | TTFB
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
}

export const trackWebVital = (metric: WebVitalSample) => {
  const nav =
    typeof navigator !== 'undefined'
      ? (navigator as Navigator & {
          connection?: { effectiveType?: string };
          deviceMemory?: number;
        })
      : undefined;

  const round = (n: number) => Math.round(n * 1000) / 1000;

  return Analytics.track('web_vital', {
    metric_name: metric.name,
    metric_value: round(metric.value),
    metric_rating: metric.rating,
    metric_delta: round(metric.delta),
    metric_id: metric.id,
    page_path: typeof window !== 'undefined' ? window.location.pathname : undefined,
    connection_type: nav?.connection?.effectiveType,
    device_memory: nav?.deviceMemory,
    viewport_width: typeof window !== 'undefined' ? window.innerWidth : undefined,
  });
};

// Initialize on import
if (typeof window !== 'undefined') {
  Analytics.init();
}

export default Analytics;

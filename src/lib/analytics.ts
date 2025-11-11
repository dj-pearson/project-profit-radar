import { supabase } from '@/integrations/supabase/client';
import { logger } from './logger';
import { safeStorage } from './safeStorage';

/**
 * Analytics tracking utilities for BuildDesk
 * Integrates with PostHog (when available) and Supabase for event tracking
 */

// Types
export interface EventProperties {
  [key: string]: any;
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
  [key: string]: any;
}

// Initialize PostHog (lazy loaded)
let posthog: any = null;

const initPostHog = async () => {
  if (typeof window === 'undefined') return null;
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

  await (supabase as any).from('user_events').insert({
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

// Core Analytics Class
export class Analytics {
  private static initialized = false;

  static async init() {
    if (this.initialized) return;
    await initPostHog();
    this.initialized = true;
  }

  /**
   * Track a custom event
   */
  static async track(eventName: string, properties?: EventProperties) {
    // Track in PostHog if available
    if (posthog) {
      posthog.capture(eventName, properties);
    }

    // Always track in Supabase
    await trackInSupabase(eventName, properties);
  }

  /**
   * Identify a user
   */
  static async identify(userId: string, properties?: UserProperties) {
    if (posthog) {
      posthog.identify(userId, properties);
    }

    // Store user properties
    try {
      await (supabase as any).from('user_engagement_summary').upsert({
        user_id: userId,
        ...properties,
      }, { onConflict: 'user_id' });
    } catch (error) {
      logger.error('Failed to update user properties', error as Error, { userId });
    }
  }

  /**
   * Track a page view
   */
  static async page(pageName?: string, properties?: EventProperties) {
    if (posthog) {
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
      await (supabase as any).from('conversion_events').insert({
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

// Initialize on import
if (typeof window !== 'undefined') {
  Analytics.init();
}

export default Analytics;
